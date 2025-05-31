import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { DeleteConfirmationDialog } from './deleteConfirmation.js'

export const ArticleMenuItem = GObject.registerClass(
class ArticleMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(article, api, refreshCallback) {
        super._init({
            reactive: true,
            can_focus: true,
            style_class: 'popup-menu-item',
        });

        this._article = article;
        this._api = api;
        this._refreshCallback = refreshCallback;

        // main horizontal container
        const mainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            style_class: 'popup-menu-item-box',
        });
        this.add_child(mainBox);

        // content area for article info
        const contentBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style: 'spacing: 4px;',
        });
        mainBox.add_child(contentBox);

        // article title
        const mainLabel = new St.Label({
            text: this._getTruncatedTitle(50),
            style_class: 'popup-menu-item-title',
            x_expand: true,
            x_align: Clutter.ActorAlign.START,
        });
        contentBox.add_child(mainLabel);

        // article domain
        const domainLabel = new St.Label({
            text: this._getDomain(),
            style_class: 'popup-menu-item-subtitle',
            style: 'font-size: 0.8em; color: #888;',
        });
        contentBox.add_child(domainLabel);

        // actions container
        const actionsBox = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.END,
            style: 'spacing: 4px;',
        });
        mainBox.add_child(actionsBox);

        // archive/unarchive button
        const archiveButton = new St.Button({
            style_class: 'popup-menu-icon-button',
            can_focus: true,
            reactive: true,
        });
        const archiveIcon = new St.Icon({
            icon_name: article.is_archived ? 'checkmark-symbolic' : 'bookmark-new-symbolic',
            style_class: 'popup-menu-icon'
        });
        archiveButton.set_child(archiveIcon);
        archiveButton.connect('clicked', () => this._toggleArchive());
        actionsBox.add_child(archiveButton);

        // star/unstar button
        const starButton = new St.Button({
            style_class: 'popup-menu-icon-button',
            can_focus: true,
            reactive: true,
        });
        const starIcon = new St.Icon({
            icon_name: article.is_starred ? 'starred-symbolic' : 'non-starred-symbolic',
            style_class: 'popup-menu-icon'
        });
        starButton.set_child(starIcon);
        starButton.connect('clicked', () => this._toggleStar());
        actionsBox.add_child(starButton);

        // copy button
        const copyButton = new St.Button({
            style_class: 'popup-menu-icon-button',
            can_focus: true,
            reactive: true,
        });
        const copyIcon = new St.Icon({
            icon_name: 'edit-copy-symbolic',
            style_class: 'popup-menu-icon'
        });
        copyButton.set_child(copyIcon);
        copyButton.connect('clicked', () => {
            this._copyArticleUrl();
            this._parent._getTopMenu().close();
        });
        actionsBox.add_child(copyButton);

        // delete button
        const deleteButton = new St.Button({
            style_class: 'popup-menu-icon-button',
            can_focus: true,
            reactive: true,
        });
        const deleteIcon = new St.Icon({
            icon_name: 'edit-delete-symbolic',
            style_class: 'popup-menu-icon'
        });
        deleteButton.set_child(deleteIcon);
        deleteButton.connect('clicked', () => this._deleteArticle());
        actionsBox.add_child(deleteButton);

        // connect main click handler for opening article
        this.connect('activate', () => this._openArticle());
    }

    _getTruncatedTitle(maxLength) {
        if (this._article.title.length > maxLength) {
            return this._article.title.substr(0, maxLength - 3) + '...';
        }
        return this._article.title;
    }

    _getDomain() {
        try {
            return GLib.Uri.parse(this._article.url, GLib.UriFlags.NONE).get_host().replace('www.', '');
        } catch (e) {
            console.error(`Failed to parse URL ${this._article.url}:`, e);
            return '<Invalid URL>';
        }
    }

    _openArticle() {
        try {
            Gio.AppInfo.launch_default_for_uri(this._article.url, null);
        } catch (e) {
            console.error('Failed to open article:', e);
            Main.notify('Wallapocket', _('Failed to open article'));
        }
    }

    async _toggleArchive() {
        try {
            if (this._article.is_archived) {
                await this._api.markAsUnread(this._article.id);
                Main.notify('Wallapocket', _('Article marked as unread'));
            } else {
                await this._api.markAsRead(this._article.id);
                Main.notify('Wallapocket', _('Article marked as read'));
            }
            this._refreshCallback();
        } catch (e) {
            console.error('Failed to toggle archive status:', e);
            Main.notify('Wallapocket', _('Failed to update article status'));
        }
    }

    async _toggleStar() {
        try {
            await this._api.toggleFavorite(this._article.id);
            const message = this._article.is_starred ? _('Article removed from favorites') : _('Article added to favorites');
            Main.notify('Wallapocket', message);
            this._refreshCallback();
        } catch (e) {
            console.error('Failed to toggle star status:', e);
            Main.notify('Wallapocket', _('Failed to update article status'));
        }
    }

    _copyArticleUrl() {
        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, this._article.url);
    }

    async _deleteArticle() {
        try {
            const dialog = new DeleteConfirmationDialog(
                this._article.title,
                async () => {
                    await this._api.deleteArticle(this._article.id);
                    Main.notify('Wallapocket', _('Article deleted successfully'));
                    this._refreshCallback();
                }
            );
            dialog.open();
        } catch (e) {
            console.error('Failed to delete article:', e);
            Main.notify('Wallapocket', _('Failed to delete article'));
        }
    }

    destroy() {
        super.destroy();
    }
});
