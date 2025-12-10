import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export const QuickSaveDialog = GObject.registerClass(
class QuickSaveDialog extends ModalDialog.ModalDialog {
    _init(api, notifications, resave, refreshCallback) {
        super._init({styleClass: 'run-dialog'});

        this._api = api;
        this._notifications = notifications;
        this._resave = resave;
        this._refreshCallback = refreshCallback;

        // URL section
        const urlLabel = new St.Label({
            text: _('Enter URL to save:'),
            style_class: 'run-dialog-label',
        });
        this.contentLayout.add_child(urlLabel);

        this._urlEntry = new St.Entry({
            style_class: 'run-dialog-entry',
            can_focus: true,
            hint_text: 'https://...',
        });
        this.contentLayout.add_child(this._urlEntry);
        this._fillUrlFromClipboard();
        this._urlEntry.clutter_text.connect('activate', () => this._focusNextField());

        // Title section
        const titleLabel = new St.Label({
            text: _('Article title (optional):'),
            style_class: 'run-dialog-label',
            style: 'margin-top: 12px;',
        });
        this.contentLayout.add_child(titleLabel);

        this._titleEntry = new St.Entry({
            style_class: 'run-dialog-entry',
            can_focus: true,
            hint_text: _('Leave empty to use the original title'),
        });
        this.contentLayout.add_child(this._titleEntry);
        this._titleEntry.clutter_text.connect('activate', () => this._save());

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
            if (this._refreshCallback)
                this._refreshCallback();
        } catch (e) {
            console.error('Failed to save article:', e);
            this._notifications.showError(_('Failed to save article'));
        }
    }

    _focusNextField() {
        this._titleEntry.grab_key_focus();
    }

    _fillUrlFromClipboard() {
        const clipboard = St.Clipboard.get_default();
        clipboard.get_text(St.ClipboardType.CLIPBOARD, (_cb, text) => {
            if (this._isValidHttpUrl(text)) {
                this._urlEntry.set_text(text.trim());
                this._urlEntry.grab_key_focus();
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    this._urlEntry.clutter_text.set_selection(0, -1);
                    return GLib.SOURCE_REMOVE;
                });
            }
        });
    }

    _isValidHttpUrl(text) {
        if (!text)
            return false;

        const trimmed = text.trim().toLowerCase();
        return trimmed.startsWith('https://') || trimmed.startsWith('http://');
    }

    open() {
        super.open();
        this._urlEntry.grab_key_focus();
    }
});
