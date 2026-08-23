// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export class NotificationManager {
    constructor(appName, settings, icons) {
        this._appName = appName;
        this._settings = settings;
        this._icons = icons;
        this._source = null;
        this._sourceDestroyId = null;
    }

    destroy() {
        if (this._source) {
            this._source.disconnect(this._sourceDestroyId);
            this._sourceDestroyId = null;
            this._source.destroy();
            this._source = null;
        }
        this._settings = null;
        this._icons = null;
    }

    showArticleNotification(article) {
        if (!this._settings.get_boolean('show-new-article-notifications'))
            return;

        const notification = this._createNotification({
            title: _('New article'),
            body: article.title,
            iconName: 'bookmark-new-symbolic',
            urgency: MessageTray.Urgency.CRITICAL,
        });

        if (article.url)
            notification.addAction(_('Open Article'), () => Gio.AppInfo.launch_default_for_uri(article.url, null));

        this._source.addNotification(notification);
    }

    showError(message) {
        const notification = this._createNotification({
            title: _('Error'),
            body: message,
            iconName: 'dialog-error-symbolic',
            urgency: MessageTray.Urgency.NORMAL,
        });
        this._source.addNotification(notification);
    }

    showInfo(message) {
        if (!this._settings.get_boolean('show-notifications'))
            return;

        const notification = this._createNotification({
            title: this._appName,
            body: message,
            iconName: 'dialog-information-symbolic',
            urgency: MessageTray.Urgency.NORMAL,
        });
        this._source.addNotification(notification);
    }

    _createNotification({title, body, iconName, urgency}) {
        return new MessageTray.Notification({
            source: this._getSource(),
            title,
            body,
            'icon-name': iconName,
            urgency,
        });
    }

    _getSource() {
        if (!this._source) {
            this._source = new MessageTray.Source({
                title: this._appName,
                icon: this._icons.getCustomIcon('wallapocket-notif'),
            });
            this._sourceDestroyId = this._source.connect('destroy', () => {
                this._source = null;
                this._sourceDestroyId = null;
            });
            Main.messageTray.add(this._source);
        }
        return this._source;
    }
}
