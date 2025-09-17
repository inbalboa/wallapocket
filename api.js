import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

export class WallabagApi {
    constructor(settings) {
        this._settings = settings;
        this._session = new Soup.Session();
        this._accessToken = null;
        this._tokenExpiry = null;
    }

    resetToken() {
        // Force re-authentication on settings change and refill preferences
        this._accessToken = null;
        this._tokenExpiry = null;
    }

    async _authenticate() {
        // Check if we have a valid token
        if (this._accessToken && this._tokenExpiry && Date.now() < this._tokenExpiry)
            return this._accessToken;


        const serverUrl = this._settings.get_string('server-url');
        const clientId = this._settings.get_string('client-id');
        const clientSecret = this._settings.get_string('client-secret');
        const username = this._settings.get_string('username');
        const password = this._settings.get_string('password');

        if (!serverUrl || !clientId || !clientSecret || !username || !password)
            throw new Error('Missing required settings');


        const authUrl = `${serverUrl}/oauth/v2/token`;
        const authData = {
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username,
            password,
        };

        const message = Soup.Message.new('POST', authUrl);
        message.set_request_body_from_bytes(
            'application/x-www-form-urlencoded',
            new GLib.Bytes(this._encodeFormData(authData))
        );

        const response = await this._sendRequest(message);
        const data = JSON.parse(response);

        this._accessToken = data.access_token;
        this._tokenExpiry = Date.now() + (data.expires_in * 1000);

        return this._accessToken;
    }

    async _sendRequest(message) {
        const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        const response = new TextDecoder('utf-8').decode(bytes.get_data());
        if (message.get_status() !== Soup.Status.OK)
            throw new Error(`HTTP ${message.get_status()}: ${response}`);
        return response;
    }

    async _apiRequest(endpoint, method = 'GET', data = null) {
        const token = await this._authenticate();
        const serverUrl = this._settings.get_string('server-url');
        const url = `${serverUrl}/api${endpoint}`;

        const message = Soup.Message.new(method, url);
        message.get_request_headers().append('Authorization', `Bearer ${token}`);

        if (data) {
            message.set_request_body_from_bytes(
                'application/json',
                new GLib.Bytes(JSON.stringify(data))
            );
            message.get_request_headers().append('Content-Type', 'application/json');
        }

        try {
            const response = await this._sendRequest(message);
            return JSON.parse(response);
        } catch (e) {
            if (e.message.includes('HTTP 401')) {
                console.log('Token has expired, refreshing and retrying...');
                this.resetToken();
                return this._apiRequest(endpoint, method, data);
            }

            throw e;
        }
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

        // delete and try to add again with unbroken url and title
        await this.deleteArticle(respBody.id);
        const originUrl = respBody.origin_url || respBody.given_url;
        const titleByPage = await this._getPageTitle(originUrl);
        const newTitle = titleByPage || originUrl;
        return await this.saveArticle(originUrl, newTitle, newTitle, [], false);
    }

    async _getPageTitle(url) {
        const USER_AGENTS = {
            chrome_linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            chrome_windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            chrome_mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            firefox_linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
            firefox_windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            safari_mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            edge_windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        };

        let html = null;
        const message = Soup.Message.new('GET', url);

        // get random user agent
        const agents = Object.values(USER_AGENTS);
        const agent = agents[Math.floor(Math.random() * agents.length)];
        message.request_headers.append('User-Agent', agent);

        message.request_headers.append('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
        message.request_headers.append('Accept-Language', 'en-US,en;q=0.5');
        message.request_headers.append('Accept-Encoding', 'gzip, deflate');
        message.request_headers.append('Connection', 'keep-alive');
        message.request_headers.append('Upgrade-Insecure-Requests', '1');

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

        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' ',
        };

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch?.[1])
            return titleMatch[1].trim().replace(/&[^;]+;/g, e => entities[e] || e);
        return null;
    }

    async getRecentArticles(since = null, limit = 999) {
        let url = `/entries.json?perPage=${limit}&order=desc&sort=created`;
        if (since)
            url += `&since=${new Date(since).getTime()}`;

        const response = await this._apiRequest(url);
        return response._embedded?.items || [];
    }

    async deleteArticle(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'DELETE');
    }

    async markAsRead(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', {archive: 1});
    }

    async markAsUnread(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', {archive: 0});
    }

    async star(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', {starred: 1});
    }

    async unstar(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', {starred: 0});
    }

    async updateTitle(id, title) {
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', {title});
    }

    async getDeletedEntries(hashedUrls) {
        let url = '/entries/exists?';
        hashedUrls.forEach((x, i) => {
            if (i === 0)
                url += `hashed_urls[]=${x}`;
            else
                url += `&hashed_urls[]=${x}`;
        });
        const response = await this._apiRequest(url);
        const deletedHashedUrls = [];
        Object.entries(response).forEach(([hashedUrl, exists]) => {
            if (!exists)
                deletedHashedUrls.push(hashedUrl);
        });
        return deletedHashedUrls;
    }

    _encodeFormData(data) {
        return Object.keys(data)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
    }
}
