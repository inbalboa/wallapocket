import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {WallabagApi} from './api.js';
import {ArticleMenuItem} from './item.js';
import {QuickSaveDialog} from './save.js';
import {NotificationManager} from './notifications.js';

const WallapocketIndicator = GObject.registerClass(
class WallapocketIndicator extends PanelMenu.Button {
    _init(extension, icons) {
        super._init(0.0, 'Wallapocket');

        this._extension = extension;
        this._icons = icons;
        this._settings = extension.getSettings();
        this._api = new WallabagApi(this._settings);
        this._refreshTimer = null;
        this._lastUpdateTime = null;
        this._articles = [];
        this._notifications = new NotificationManager(extension, icons);

        const hbox = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
        });
        const icon = new St.Icon({
            gicon: this._icons.getCustomIcon('wallapocket'),
            style_class: 'system-status-icon',
        });
        hbox.add_child(icon);
        this._countLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });
        hbox.add_child(this._countLabel);
        this.add_child(hbox);

        this._fillSettings();
        this._buildMenu();

        // Connect to settings changes
        this._settingsConnection = this._settings.connect('changed', () => {
            this._fillSettings();
            this._api.resetToken();
            this._setupAutoRefresh();
        });

        // Setup initial auto-refresh
        this._setupAutoRefresh();
    }

    _fillSettings() {
        this._serverUrl = this._settings.get_string('server-url');
        this._maxArticles = this._settings.get_int('max-articles');
        this._refreshInterval = this._settings.get_int('refresh-interval');
    }

    _setupAutoRefresh() {
        if (this._refreshTimer) {  // clear existing
            GLib.Source.remove(this._refreshTimer);
            this._refreshTimer = null;
        }

        if (this._refreshInterval > 0) {  // set up new
            const intervalMs = this._refreshInterval * 60 * 1000;  // minutes -> milliseconds
            this._refreshTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
                this._refreshArticles();
                return GLib.SOURCE_CONTINUE; // keep the timer running
            });
        }
    }

    _buildMenu() {
        // Recent articles section
        this._recentSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._recentSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Refresh section
        this._refreshItem = new PopupMenu.PopupMenuItem(_('Refresh'));
        this._refreshItem.connect('activate', () => this._refreshArticles());
        this.menu.addMenuItem(this._refreshItem);
        // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Quick save section
        this._quickSaveItem = new PopupMenu.PopupMenuItem(_('Quick save'));
        this._quickSaveItem.connect('activate', () => this._showQuickSaveDialog());
        this.menu.addMenuItem(this._quickSaveItem);
        // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Open Wallabag section
        this._openWallabag = new PopupMenu.PopupMenuItem(_('Open Wallabag'));
        this._openWallabag.connect('activate', () => Gio.AppInfo.launch_default_for_uri(this._serverUrl, null));
        this.menu.addMenuItem(this._openWallabag);

        // Load initial articles
        this._refreshArticles(true);
    }

    _showQuickSaveDialog() {
        const dialog = new QuickSaveDialog(this._api, this._notifications, this._settings.get_boolean('re-save-unsuccessfully-saved-articles'), () => this._refreshArticles(true));
        dialog.open();
    }

    async _refreshArticles(force = false) {
        if (force) {
            this._lastUpdateTime = null;
            this._articles = [];
        }
        const prevLastUpdateTime = this._lastUpdateTime;
        try {
            this._lastUpdateTime = Date.now();
            const newArticles = await this._api.getRecentArticles(this._lastUpdateTime);
            let deletedUrls = [];
            if (this._articles.length > 0) {
                const existingUrls = this._articles.map(a => a.hashed_url);
                deletedUrls = await this._api.getDeletedEntries(existingUrls);
                if (deletedUrls.length > 0)
                    this._articles = this._articles.filter(a => !deletedUrls.includes(a.hashed_url));
            }
            if (newArticles.length > 0) {
                // Merge new articles with existing ones, avoiding duplicates
                const existingIds = new Set(this._articles.map(a => a.id));
                const uniqueNewArticles = newArticles.filter(a => !existingIds.has(a.id));
                this._articles = [...uniqueNewArticles, ...this._articles];

                // Show notification for new articles
                if (!force)
                    uniqueNewArticles.forEach(a => { this._notifications.showArticleNotification(a) });
            }
            if (force || newArticles.length > 0 || deletedUrls.length > 0) {
                this._updateArticleCount();
                this._updateArticlesList();
            }
        } catch (e) {
            this._lastUpdateTime = prevLastUpdateTime;
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

        const showArchiveButton = this._settings.get_boolean('show-archive-button');
        const showStarButton = this._settings.get_boolean('show-star-button');
        const showCopyButton = this._settings.get_boolean('show-copy-button');
        const showDeleteButton = this._settings.get_boolean('show-delete-button');
        const showEditTitleButton = this._settings.get_boolean('show-edit-title-button');
        this._articles.slice(0, this._maxArticles).forEach(a => {
                this._recentSection.addMenuItem(new ArticleMenuItem(a, this._api, this._notifications, () => this._refreshArticles(true), showArchiveButton, showStarButton, showCopyButton, showDeleteButton, showEditTitleButton))
            }
        );
    }

    _openSettings() {
        this._extension.openPreferences();
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
        super.destroy();
    }
});

const ExtensionIcons = GObject.registerClass({}, class ExtensionIcons extends GObject.Object {
    _init(extensionDir) {
        this._extensionDir = extensionDir;
        this.iconTheme = new St.IconTheme();
    }

    _isLightTheme() {
        const themeContext = St.ThemeContext.get_for_stage(global.stage);  // eslint-disable-line no-undef
        const theme = themeContext.get_theme();

        // Some heuristics to detect light themes
        const stylesheetContent = theme.get_default_stylesheet()?.get_uri() || '';

        return stylesheetContent.toLowerCase().includes('light') ||
               Main.sessionMode.stylesheetName?.toLowerCase().includes('light');
    }

    getCustomIcon(iconName) {
        if (this.iconTheme.has_icon(iconName))
            return Gio.ThemedIcon.new_with_default_fallbacks(iconName);

        const themeAwareIconName = `${iconName}-${this._isLightTheme() ? 'dark' : 'light'}`;
        const iconPath = this._extensionDir.get_child('icons').get_child(`${themeAwareIconName}.svg`).get_path();
        return Gio.icon_new_for_string(iconPath);
    }
});

export default class WallapocketExtension extends Extension {
    enable() {
        const icons = new ExtensionIcons(this.dir);
        this._indicator = new WallapocketIndicator(this, icons);
        Main.panel.addToStatusArea('wallapocket', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
