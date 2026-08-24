// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {WallabagApi} from './api.js';
import {ArticleMenuItem} from './item.js';
import {QuickSaveDialog} from './save.js';
import {NotificationManager} from './notifications.js';
import {isCancelled} from './util.js';

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export const WallapocketIndicator = GObject.registerClass(
class WallapocketPanelIndicator extends PanelMenu.Button {
    _init(extension, icons) {
        super._init(0.5, 'Wallapocket');

        this._settings = extension.getSettings();
        this._api = new WallabagApi(this._settings);
        this._notifications = new NotificationManager(extension.metadata.name, this._settings, icons);
        this._refreshTimer = null;
        this._lastUpdateTime = null;
        this._articles = [];
        this._dialog = null;

        const hbox = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
        });
        const icon = new St.Icon({
            gicon: icons.getCustomIcon('wallapocket'),
            style_class: 'system-status-icon',
        });
        icon.set_style('padding-right: 0px; padding-left: 0px;');
        hbox.add_child(icon);
        this._countLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });
        hbox.add_child(this._countLabel);
        this.add_child(hbox);

        this._fillSettings();
        this._buildMenu();

        this._settingsConnection = this._settings.connect('changed', () => {
            this._fillSettings();
            this._api.resetToken();
            this._setupAutoRefresh();
        });

        this._setupAutoRefresh();
    }

    destroy() {
        if (this._refreshTimer) {
            GLib.Source.remove(this._refreshTimer);
            this._refreshTimer = null;
        }

        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

        if (this._dialog) {
            this._dialog.destroy();
            this._dialog = null;
        }

        this._api.destroy();
        this._api = null;
        this._notifications.destroy();
        this._notifications = null;
        this._articles = null;
        this._settings = null;

        super.destroy();
    }

    _fillSettings() {
        this._serverUrl = this._settings.get_string('server-url');
        this._maxArticles = this._settings.get_int('max-articles');
        this._refreshInterval = this._settings.get_int('refresh-interval');
        this._resaveArticles = this._settings.get_boolean('re-save-unsuccessfully-saved-articles');
        this._buttonVisibility = {
            archive: this._settings.get_boolean('show-archive-button'),
            star: this._settings.get_boolean('show-star-button'),
            copy: this._settings.get_boolean('show-copy-button'),
            editTitle: this._settings.get_boolean('show-edit-title-button'),
            delete: this._settings.get_boolean('show-delete-button'),
        };
    }

    _setupAutoRefresh() {
        if (this._refreshTimer) {
            GLib.Source.remove(this._refreshTimer);
            this._refreshTimer = null;
        }
        if (this._refreshInterval > 0) {
            const intervalMs = this._refreshInterval * MILLISECONDS_PER_MINUTE;
            this._refreshTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
                this._refreshArticles();
                return GLib.SOURCE_CONTINUE;
            });
        }
    }

    _buildMenu() {
        this._recentSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._recentSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._addActionItem(_('Refresh'), () => this._refreshArticles());
        this._addActionItem(_('Quick save'), () => this._showQuickSaveDialog());
        this._addActionItem(_('Open Wallabag'), () => Gio.AppInfo.launch_default_for_uri(this._serverUrl, null));

        this._refreshArticles(true);
    }

    _addActionItem(label, callback) {
        const item = new PopupMenu.PopupMenuItem(label);
        item.connect('activate', callback);
        this.menu.addMenuItem(item);
    }

    _showQuickSaveDialog() {
        this._dialog = new QuickSaveDialog(this._api, this._notifications, this._resaveArticles, () => this._refreshArticles(true));
        this._dialog.connect('destroy', () => (this._dialog = null));
        this._dialog.open();
    }

    async _refreshArticles(force = false) {
        if (force) {
            this._lastUpdateTime = null;
            this._articles = [];
        }
        try {
            const updateTime = Date.now();
            const newArticles = await this._api.getRecentArticles(this._lastUpdateTime);
            this._lastUpdateTime = updateTime;
            let deletedUrls = [];
            if (this._articles.length > 0) {
                const existingUrls = this._articles.map(a => a.hashed_url);
                deletedUrls = await this._api.getDeletedEntries(existingUrls);
                if (deletedUrls.length > 0)
                    this._articles = this._articles.filter(a => !deletedUrls.includes(a.hashed_url));
            }
            let addedArticles = [];
            if (newArticles.length > 0) {
                const existingIds = new Set(this._articles.map(a => a.id));
                addedArticles = newArticles.filter(a => !existingIds.has(a.id));
                this._articles = [...addedArticles, ...this._articles];

                if (!force)
                    addedArticles.forEach(a => this._notifications.showArticleNotification(a));
            }
            if (force || addedArticles.length > 0 || deletedUrls.length > 0) {
                this._updateArticleCount();
                this._updateArticlesList();
            }
        } catch (e) {
            if (isCancelled(e))
                return;

            console.error('Failed to fetch articles:', e);
            this._notifications.showError(_('Failed to fetch articles'));
        }
    }

    _updateArticleCount() {
        const count = this._articles.length;
        if (count > 0) {
            this._countLabel.text = count.toString();
            this._countLabel.show();
        } else {
            this._countLabel.hide();
        }
    }

    _updateArticlesList() {
        this._recentSection.removeAll();

        if (this._articles.length === 0) {
            const noArticlesItem = new PopupMenu.PopupMenuItem(_('No articles found'));
            noArticlesItem.sensitive = false;
            this._recentSection.addMenuItem(noArticlesItem);
            return;
        }

        const refreshCallback = () => this._refreshArticles(true);
        this._articles.slice(0, this._maxArticles).forEach(a => {
            const item = new ArticleMenuItem(a, this._api, this._notifications, refreshCallback, this._buttonVisibility);
            this._recentSection.addMenuItem(item);
        });
    }
});
