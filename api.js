// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

const USER_AGENTS = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

// Wallabag compares `since` with a strict `>`, so step back a second to not miss entries created within the same second as the previous refresh
const SINCE_OVERLAP_SECONDS = 1;

const HTML_ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
};

export class WallabagApi {
    constructor(settings) {
        this._settings = settings;
        this._session = new Soup.Session();
        this._cancellable = new Gio.Cancellable();
        this._accessToken = null;
        this._tokenExpiry = null;
    }

    destroy() {
        this._cancellable.cancel();
        this._cancellable = null;
        this._session.abort();
        this._session = null;
        this._settings = null;
        this.resetToken();
    }

    resetToken() {
        this._accessToken = null;
        this._tokenExpiry = null;
    }

    async saveArticle(url, title = null, content = null, tags = [], tryToReSave = true) {
        const data = {url};

        if (title)
            data.title = title;

        if (content)
            data.content = content;

        if (tags.length > 0)
            data.tags = tags.join(',');

        const respBody = await this._apiRequest('/entries.json', 'POST', data);
        const httpCode = parseInt(respBody.http_status || 200, 10);
        if (!tryToReSave || httpCode >= 200 && httpCode < 300)
            return respBody;

        // Wallabag failed to fetch the page itself, so re-add it with a locally fetched title
        await this.deleteArticle(respBody.id);
        const originUrl = respBody.origin_url || respBody.given_url;
        const titleByPage = await this._getPageTitle(originUrl);
        const newTitle = titleByPage || originUrl;
        return this.saveArticle(originUrl, newTitle, newTitle, [], false);
    }

    async getRecentArticles(since = null, limit = 999) {
        let url = `/entries.json?perPage=${limit}&order=desc&sort=created`;
        if (since)
            url += `&since=${Math.floor(since / 1000) - SINCE_OVERLAP_SECONDS}`;

        const response = await this._apiRequest(url);
        return response._embedded?.items || [];
    }

    async getDeletedEntries(hashedUrls) {
        const query = hashedUrls.map(x => `hashed_urls[]=${x}`).join('&');
        const response = await this._apiRequest(`/entries/exists?${query}`);
        return Object.entries(response)
            .filter(([, exists]) => !exists)
            .map(([hashedUrl]) => hashedUrl);
    }

    deleteArticle(id) {
        return this._apiRequest(`/entries/${id}.json`, 'DELETE');
    }

    markAsRead(id) {
        return this._apiRequest(`/entries/${id}.json`, 'PATCH', {archive: 1});
    }

    markAsUnread(id) {
        return this._apiRequest(`/entries/${id}.json`, 'PATCH', {archive: 0});
    }

    star(id) {
        return this._apiRequest(`/entries/${id}.json`, 'PATCH', {starred: 1});
    }

    unstar(id) {
        return this._apiRequest(`/entries/${id}.json`, 'PATCH', {starred: 0});
    }

    updateTitle(id, title) {
        return this._apiRequest(`/entries/${id}.json`, 'PATCH', {title});
    }

    async _authenticate() {
        if (this._accessToken && this._tokenExpiry && Date.now() < this._tokenExpiry)
            return this._accessToken;

        const serverUrl = this._settings.get_string('server-url');
        const clientId = this._settings.get_string('client-id');
        const clientSecret = this._settings.get_string('client-secret');
        const username = this._settings.get_string('username');
        const password = this._settings.get_string('password');

        if (!serverUrl || !clientId || !clientSecret || !username || !password)
            throw new Error('Missing required settings');

        const authData = {
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username,
            password,
        };

        const message = Soup.Message.new('POST', `${serverUrl}/oauth/v2/token`);
        message.set_request_body_from_bytes(
            'application/x-www-form-urlencoded',
            new GLib.Bytes(this._encodeFormData(authData))
        );

        const data = JSON.parse(await this._sendRequest(message));
        this._accessToken = data.access_token;
        this._tokenExpiry = Date.now() + data.expires_in * 1000;

        return this._accessToken;
    }

    async _sendRequest(message) {
        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, this._cancellable);
        const response = new TextDecoder('utf-8').decode(bytes.get_data());
        if (message.get_status() !== Soup.Status.OK)
            throw new Error(`HTTP ${message.get_status()}: ${response}`);
        return response;
    }

    async _apiRequest(endpoint, method = 'GET', data = null) {
        const token = await this._authenticate();
        const serverUrl = this._settings.get_string('server-url');

        const message = Soup.Message.new(method, `${serverUrl}/api${endpoint}`);
        message.get_request_headers().append('Authorization', `Bearer ${token}`);

        if (data) {
            message.set_request_body_from_bytes(
                'application/json',
                new GLib.Bytes(JSON.stringify(data))
            );
            message.get_request_headers().append('Content-Type', 'application/json');
        }

        try {
            return JSON.parse(await this._sendRequest(message));
        } catch (e) {
            if (e.message.includes('HTTP 401')) {
                this.resetToken();
                return this._apiRequest(endpoint, method, data);
            }

            throw e;
        }
    }

    async _getPageTitle(url) {
        const message = Soup.Message.new('GET', url);
        const headers = message.get_request_headers();
        headers.append('User-Agent', USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
        headers.append('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
        headers.append('Accept-Language', 'en-US,en;q=0.5');
        headers.append('Accept-Encoding', 'gzip, deflate');
        headers.append('Connection', 'keep-alive');
        headers.append('Upgrade-Insecure-Requests', '1');

        let html = null;
        try {
            html = await this._sendRequest(message);
        } catch (e) {
            console.error('Request failed:', e);
        }
        return this._extractTitleFromHtml(html);
    }

    _extractTitleFromHtml(html) {
        if (!html)
            return null;

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch?.[1])
            return titleMatch[1].trim().replace(/&[^;]+;/g, e => HTML_ENTITIES[e] || e);

        return null;
    }

    _encodeFormData(data) {
        return Object.keys(data)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
    }
}
