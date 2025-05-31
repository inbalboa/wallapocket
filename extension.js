import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { WallabagApi } from './wallabagApi.js';
import { ArticleMenuItem } from './item.js';
import { QuickSaveDialog } from './quickSave.js'

const WallapocketIndicator = GObject.registerClass(
class WallapocketIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'Wallapocket');

        this._extension = extension;
        this._settings = extension.getSettings();
        this._api = new WallabagApi(this._settings);

        const hbox = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
        });
        const icon = new St.Icon({
            icon_name: 'bookmark-new-symbolic',
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
            this._api.updateSettings();
        });
    }

    _fillSettings() {
        this._serverUrl = this._settings.get_string('server-url');
        this._maxArticles = this._settings.get_int('max-articles');
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
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Quick save section
        this._quickSaveItem = new PopupMenu.PopupMenuItem(_('Quick save'));
        this._quickSaveItem.connect('activate', () => this._showQuickSaveDialog());
        this.menu.addMenuItem(this._quickSaveItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Open Wallabag section
        this._openWallabag = new PopupMenu.PopupMenuItem(_('Open Wallabag'));
        this._openWallabag.connect('activate', () => Gio.AppInfo.launch_default_for_uri(this._serverUrl, null));
        this.menu.addMenuItem(this._openWallabag);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Load initial articles
        this._refreshArticles();
    }

    _showQuickSaveDialog() {
        const dialog = new QuickSaveDialog(this._api, this);
        dialog.open();
    }

    async _refreshArticles() {
        try {
            this._articles = await this._api.getRecentArticles();
            this._updateArticleCount();
            this._updateArticlesList();
        } catch (e) {
            console.error('Failed to fetch articles:', e);
            this._showError(_('Failed to fetch articles'));
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

        this._articles.slice(0, this._maxArticles).forEach(a => {
            this._recentSection.addMenuItem(new ArticleMenuItem(a, this._api, () => this._refreshArticles()));
        });
    }

    _showNotification(message) {
        Main.notify('Wallapocket', message);
    }

    _showError(message) {
        Main.notify('Wallapocket', message);
    }

    _openSettings() {
        this._extension.openPreferences();
    }

    destroy() {
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }
        super.destroy();
    }
});

export default class WallapocketExtension extends Extension {
    enable() {
        this._indicator = new WallapocketIndicator(this);
        Main.panel.addToStatusArea('wallapocket', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
