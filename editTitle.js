import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export const EditTitleDialog = GObject.registerClass(
class EditTitleDialog extends ModalDialog.ModalDialog {
    _init(article, api, notifications, refreshCallback) {
        super._init({styleClass: 'run-dialog'});

        this._article = article;
        this._api = api;
        this._notifications = notifications;
        this._refreshCallback = refreshCallback;

        const label = new St.Label({
            text: _('Edit article title:'),
            style_class: 'run-dialog-label',
        });
        this.contentLayout.add_child(label);

        this._entry = new St.Entry({
            style_class: 'run-dialog-entry',
            can_focus: true,
            text: this._article.title,
            hint_text: this._article.title,
        });
        this.contentLayout.add_child(this._entry);
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
        const newTitle = this._entry.get_text().trim();
        if (!newTitle || newTitle === this._article.title)
            return;

        try {
            await this._api.updateTitle(this._article.id, newTitle);
            this._notifications.showInfo(_('Article title updated successfully'));
            this._refreshCallback();
            this.close();
        } catch (e) {
            console.error('Failed to update article title:', e);
            this._notifications.showError(_('Failed to update article title'));
        }
    }

    open() {
        super.open();
        this._entry.grab_key_focus();
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._entry.clutter_text.set_selection(0, -1);
            return GLib.SOURCE_REMOVE;
        });
    }
});
