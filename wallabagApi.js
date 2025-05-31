import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';

export class WallabagApi {
    constructor(settings) {
        this._settings = settings;
        this._session = new Soup.Session();
        this._accessToken = null;
        this._tokenExpiry = null;
    }
    
    updateSettings() {
        // Force re-authentication on settings change and refill preferences
        this._accessToken = null;
        this._tokenExpiry = null;
    }
    
    async _authenticate() {
        // Check if we have a valid token
        if (this._accessToken && this._tokenExpiry && Date.now() < this._tokenExpiry) {
            return this._accessToken;
        }
        
        const serverUrl = this._settings.get_string('server-url');
        const clientId = this._settings.get_string('client-id');
        const clientSecret = this._settings.get_string('client-secret');
        const username = this._settings.get_string('username');
        const password = this._settings.get_string('password');
        
        if (!serverUrl || !clientId || !clientSecret || !username || !password) {
            throw new Error('Missing required settings');
        }
        
        const authUrl = `${serverUrl}/oauth/v2/token`;
        const authData = {
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password,
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
        return new Promise((resolve, reject) => {
            this._session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null,
                (session, result) => {
                    try {
                        const bytes = session.send_and_read_finish(result);
                        const decoder = new TextDecoder('utf-8');
                        const response = decoder.decode(bytes.get_data());
                        
                        if (message.get_status() !== Soup.Status.OK) {
                            reject(new Error(`HTTP ${message.get_status()}: ${response}`));
                            return;
                        }
                        
                        resolve(response);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
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
        
        const response = await this._sendRequest(message);
        return JSON.parse(response);
    }
    
    async saveArticle(url, title = null, tags = []) {
        const data = { url };
        
        if (title) {
            data.title = title;
        }
        
        if (tags.length > 0) {
            data.tags = tags.join(',');
        }
        
        return await this._apiRequest('/entries.json', 'POST', data);
    }

    async getRecentArticles(limit = 999) {
        const response = await this._apiRequest(`/entries.json?perPage=${limit}&order=desc&sort=created`);
        return response._embedded?.items || [];
    }
    
    async getArticle(id) {
        return await this._apiRequest(`/entries/${id}.json`);
    }
    
    async deleteArticle(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'DELETE');
    }
    
    async markAsRead(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', { archive: 1 });
    }

    async markAsUnread(id) {
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', { archive: 0 });
    }

    async toggleFavorite(id) {
        const article = await this.getArticle(id);
        const starred = article.is_starred ? 0 : 1;
        return await this._apiRequest(`/entries/${id}.json`, 'PATCH', { starred });
    }

    _encodeFormData(data) {
        return Object.keys(data)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
    }
}
