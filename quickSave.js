import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export const QuickSaveDialog = GObject.registerClass(
class QuickSaveDialog extends ModalDialog.ModalDialog {
    _init(api) {
        super._init({ styleClass: 'run-dialog' });

        this._api = api;

        const label = new St.Label({
            text: _('Enter URL to save:'),
            style_class: 'run-dialog-label',
        });
        this.contentLayout.add_child(label);

        this._entry = new St.Entry({
            style_class: 'run-dialog-entry',
            can_focus: true,
            hint_text: 'https://...',
        });
        this.contentLayout.add_child(this._entry);
        this._fillUrlFromClipboard();
        this._entry.clutter_text.connect('activate', () => this._save());

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

    async _save() {
        const url = this._entry.get_text().trim();
        if (!url) {
            return;
        }
        try {
            await this._api.saveArticle(url);
            Main.notify('Wallapocket', _('Article saved successfully'));  // TODO check setting
            this.close();
        } catch (e) {
            console.error('Failed to save article:', e);
            Main.notify('Wallapocket', _('Failed to save article'));
        }
    }

    _fillUrlFromClipboard() {
        const clipboard = St.Clipboard.get_default();
        clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (this._isValidHttpUrl(text)) {
                this._entry.set_text(text.trim());
                this._entry.grab_key_focus();
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    this._entry.clutter_text.set_selection(0, -1);
                    return GLib.SOURCE_REMOVE;
                });
            }
        });
    }

    _isValidHttpUrl(text) {
        if (!text) {
            return false;
        }
        const trimmed = text.trim().toLowerCase();
        return trimmed.startsWith('https://') || trimmed.startsWith('http://');
    }

    open() {
        super.open();
        this._entry.grab_key_focus();
    }
});
