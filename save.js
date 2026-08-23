// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {isCancelled} from './util.js';

export const QuickSaveDialog = GObject.registerClass(
class WallapocketQuickSaveDialog extends ModalDialog.ModalDialog {
    _init(api, notifications, resave, refreshCallback) {
        super._init({styleClass: 'run-dialog'});

        this._api = api;
        this._notifications = notifications;
        this._resave = resave;
        this._refreshCallback = refreshCallback;
        this._selectAllId = null;

        this.contentLayout.add_child(new St.Label({
            text: _('Enter URL to save:'),
            style_class: 'run-dialog-label',
        }));

        this._urlEntry = new St.Entry({
            style_class: 'run-dialog-entry',
            can_focus: true,
            hint_text: 'https://...',
        });
        this.contentLayout.add_child(this._urlEntry);
        this._urlEntry.clutter_text.connect('activate', () => this._titleEntry.grab_key_focus());

        this.contentLayout.add_child(new St.Label({
            text: _('Article title (optional):'),
            style_class: 'run-dialog-label',
            style: 'margin-top: 12px;',
        }));

        this._titleEntry = new St.Entry({
            style_class: 'run-dialog-entry',
            can_focus: true,
            hint_text: _('Leave empty to use the original title'),
        });
        this.contentLayout.add_child(this._titleEntry);
        this._titleEntry.clutter_text.connect('activate', () => this._save());

        this._fillUrlFromClipboard();

        this.setButtons([
            {
                label: _('Cancel'),
                action: () => this.close(),
                key: Clutter.KEY_Escape,
            },
            {
                label: _('Save'),
                action: () => this._save(),
                default: true,
            },
        ]);
    }

    open() {
        super.open();
        this._urlEntry.grab_key_focus();
    }

    destroy() {
        if (this._selectAllId) {
            GLib.Source.remove(this._selectAllId);
            this._selectAllId = null;
        }
        super.destroy();
    }

    _save() {
        const url = this._urlEntry.get_text().trim();
        if (!url)
            return;

        const title = this._titleEntry.get_text().trim();
        this.close();
        this._notifications.showInfo(_('Saving article...'));
        this._saveInBackground(url, title);
    }

    async _saveInBackground(url, title) {
        try {
            await this._api.saveArticle(url, title || null, title || null, [], this._resave);
            this._notifications.showInfo(_('Article saved successfully'));
            this._refreshCallback();
        } catch (e) {
            if (isCancelled(e))
                return;

            console.error('Failed to save article:', e);
            this._notifications.showError(_('Failed to save article'));
        }
    }

    _fillUrlFromClipboard() {
        St.Clipboard.get_default().get_text(St.ClipboardType.CLIPBOARD, (_clipboard, text) => {
            if (!this._isValidHttpUrl(text))
                return;

            this._urlEntry.set_text(text.trim());
            this._urlEntry.grab_key_focus();

            if (this._selectAllId)
                GLib.Source.remove(this._selectAllId);
            this._selectAllId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this._urlEntry.clutter_text.set_selection(0, -1);
                this._selectAllId = null;
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _isValidHttpUrl(text) {
        if (!text)
            return false;

        const trimmed = text.trim().toLowerCase();
        return trimmed.startsWith('https://') || trimmed.startsWith('http://');
    }
});
