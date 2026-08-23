// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from 'gi://GObject';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import Clutter from 'gi://Clutter';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {isCancelled} from './util.js';

export const DeleteConfirmationDialog = GObject.registerClass(
class WallapocketDeleteConfirmationDialog extends ModalDialog.ModalDialog {
    _init(article, api, notifications, refreshCallback) {
        super._init({
            styleClass: 'delete-confirmation-dialog',
        });

        this._article = article;
        this._api = api;
        this._notifications = notifications;
        this._refreshCallback = refreshCallback;

        this.contentLayout.add_child(new Dialog.MessageDialogContent({
            title: _('Delete confirmation'),
            description: _('Permanently delete "%s"?\n\nThis action cannot be undone.').format(article.title),
        }));

        this.setButtons([
            {
                label: _('Cancel'),
                action: () => this.close(),
                key: Clutter.KEY_Escape,
            },
            {
                label: _('Delete'),
                action: () => this._delete(),
                default: true,
            },
        ]);
    }

    async _delete() {
        this.close();
        try {
            await this._api.deleteArticle(this._article.id);
            this._notifications.showInfo(_('Article deleted successfully'));
            this._refreshCallback();
        } catch (e) {
            if (isCancelled(e))
                return;

            console.error('Failed to delete article:', e);
            this._notifications.showError(_('Failed to delete article'));
        }
    }
});
