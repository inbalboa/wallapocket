// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {DeleteConfirmationDialog} from './delete.js';
import {EditTitleDialog} from './editTitle.js';
import {isCancelled} from './util.js';

const MAX_TITLE_LENGTH = 50;

export const ArticleMenuItem = GObject.registerClass(
class WallapocketArticleMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(article, api, notifications, refreshCallback, buttonVisibility) {
        super._init({
            reactive: true,
            can_focus: true,
            style_class: 'popup-menu-item',
        });

        this._article = article;
        this._api = api;
        this._notifications = notifications;
        this._refreshCallback = refreshCallback;
        this._dialog = null;

        const mainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            style_class: 'popup-menu-item-box',
        });
        this.add_child(mainBox);

        const contentBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style: 'spacing: 4px;',
        });
        mainBox.add_child(contentBox);

        contentBox.add_child(new St.Label({
            text: this._getTruncatedTitle(MAX_TITLE_LENGTH),
            style_class: 'popup-menu-item-title',
            x_expand: true,
            x_align: Clutter.ActorAlign.START,
        }));

        contentBox.add_child(new St.Label({
            text: this._getDomain(),
            style_class: 'popup-menu-item-subtitle',
            style: 'font-size: 0.8em; color: #888;',
        }));

        const actionsBox = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.END,
            style: 'spacing: 4px;',
        });
        mainBox.add_child(actionsBox);
        this._createButtons(actionsBox, buttonVisibility);

        this.connect('activate', () => this._openArticle());
    }

    destroy() {
        if (this._dialog) {
            this._dialog.destroy();
            this._dialog = null;
        }
        super.destroy();
    }

    _createButtons(actionsBox, buttonVisibility) {
        if (buttonVisibility.archive) {
            const iconName = this._article.is_archived ? 'checkmark-symbolic' : 'bookmark-new-symbolic';
            this._addIconButton(actionsBox, iconName, () => this._toggleArchive());
        }

        if (buttonVisibility.star) {
            const iconName = this._article.is_starred ? 'starred-symbolic' : 'non-starred-symbolic';
            this._addIconButton(actionsBox, iconName, () => this._toggleStar());
        }

        if (buttonVisibility.copy) {
            this._addIconButton(actionsBox, 'edit-copy-symbolic', () => {
                this._copyArticleUrl();
                this._getTopMenu().close();
            });
        }

        if (buttonVisibility.editTitle)
            this._addIconButton(actionsBox, 'document-edit-symbolic', () => this._editTitle());

        if (buttonVisibility.delete)
            this._addIconButton(actionsBox, 'edit-delete-symbolic', () => this._deleteArticle());
    }

    _addIconButton(actionsBox, iconName, callback) {
        const button = new St.Button({
            style_class: 'popup-menu-icon-button',
            can_focus: true,
            reactive: true,
            child: new St.Icon({
                icon_name: iconName,
                style_class: 'popup-menu-icon',
            }),
        });
        button.connect('clicked', callback);
        actionsBox.add_child(button);
    }

    _getTruncatedTitle(maxLength) {
        if (this._article.title.length > maxLength)
            return `${this._article.title.slice(0, maxLength - 3)}...`;

        return this._article.title;
    }

    _getDomain() {
        try {
            return GLib.Uri.parse(this._article.url, GLib.UriFlags.NONE).get_host().replace('www.', '');
        } catch (e) {
            console.error(`Failed to parse URL ${this._article.url}:`, e);
            return _('<Invalid URL>');
        }
    }

    _openArticle() {
        try {
            Gio.AppInfo.launch_default_for_uri(this._article.url, null);
        } catch (e) {
            console.error('Failed to open article:', e);
            this._notifications.showError(_('Failed to open article'));
        }
    }

    async _toggleArchive() {
        try {
            if (this._article.is_archived) {
                await this._api.markAsUnread(this._article.id);
                this._notifications.showInfo(_('Article marked as unread'));
            } else {
                await this._api.markAsRead(this._article.id);
                this._notifications.showInfo(_('Article marked as read'));
            }
            this._refreshCallback();
        } catch (e) {
            if (isCancelled(e))
                return;

            console.error('Failed to toggle marked status:', e);
            this._notifications.showError(_('Failed to toggle marked status'));
        }
    }

    async _toggleStar() {
        try {
            if (this._article.is_starred) {
                await this._api.unstar(this._article.id);
                this._notifications.showInfo(_('Article removed from favorites'));
            } else {
                await this._api.star(this._article.id);
                this._notifications.showInfo(_('Article added to favorites'));
            }
            this._refreshCallback();
        } catch (e) {
            if (isCancelled(e))
                return;

            console.error('Failed to toggle favorite status:', e);
            this._notifications.showError(_('Failed to toggle favorite status'));
        }
    }

    _copyArticleUrl() {
        St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this._article.url);
    }

    _editTitle() {
        this._openDialog(new EditTitleDialog(this._article, this._api, this._notifications, this._refreshCallback));
    }

    _deleteArticle() {
        this._openDialog(new DeleteConfirmationDialog(this._article, this._api, this._notifications, this._refreshCallback));
    }

    _openDialog(dialog) {
        this._dialog = dialog;
        this._dialog.connect('destroy', () => (this._dialog = null));
        this._dialog.open();
    }
});
