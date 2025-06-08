import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export class NotificationManager {
    constructor(extension, icons) {
        this._extension = extension;
        this._icons = icons;
        this._settings = extension.getSettings();
        this._notificationSource = null;
    }

    showArticleNotification(article) {
        if (!this._settings.get_boolean('show-new-article-notifications'))
            return;

        const notification = new MessageTray.Notification({
            source: this._getSource(),
            title: _('New article'),
            body: article.title,
            'icon-name': 'bookmark-new-symbolic',
            urgency: MessageTray.Urgency.CRITICAL,
        });

        if (article.url)
            notification.addAction(_('Open Article'), () => Gio.AppInfo.launch_default_for_uri(article.url, null));

        this._getSource().addNotification(notification);
    }

    showError(message) {
        // Error notifications are always shown
        const notification = new MessageTray.Notification({
            source: this._getSource(),
            title: _('Error'),
            body: message,
            'icon-name': 'dialog-error-symbolic',
            urgency: MessageTray.Urgency.NORMAL,
        });
        this._getSource().addNotification(notification);
    }

    showInfo(message) {
        if (!this._settings.get_boolean('show-notifications'))
            return;

        const notification = new MessageTray.Notification({
            source: this._getSource(),
            title: this._extension.metadata.name,
            body: message,
            'icon-name': 'dialog-information-symbolic',
            urgency: MessageTray.Urgency.NORMAL,
        });
        this._getSource().addNotification(notification);
    }

    _getSource() {
        if (!this._notificationSource) {
            this._notificationSource = new MessageTray.Source({
                title: this._extension.metadata.name,
                icon: this._icons.getCustomIcon('wallapocket-notif'),
            });
            this._notificationSource.connect('destroy', _source => {
                this._notificationSource = null;
            });
            Main.messageTray.add(this._notificationSource);
        }
        return this._notificationSource;
    }
}
