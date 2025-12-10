import GObject from 'gi://GObject';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import Clutter from 'gi://Clutter';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export const DeleteConfirmationDialog = GObject.registerClass(
class DeleteConfirmationDialog extends ModalDialog.ModalDialog {
    _init(article, api, notifications, refreshCallback) {
        super._init({
            styleClass: 'delete-confirmation-dialog',
        });

        this._article = article;
        this._api = api;
        this._notifications = notifications;
        this._refreshCallback = refreshCallback;

        const content = new Dialog.MessageDialogContent({
            title: _('Delete confirmation'),
            description: `Permanently Delete "${this._article.title}"?\n\nThis action cannot be undone.`,
        });
        this.contentLayout.add_child(content);

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

    _delete() {
        this.close();
        this._api.deleteArticle(this._article.id)
            .then(() => {
                this._notifications.showInfo(_('Article deleted successfully'));
                if (this._refreshCallback)
                    this._refreshCallback();
            })
            .catch(e => {
                console.error('Failed to delete article:', e);
                this._notifications.showError(_('Failed to delete article'));
            });
    }
});
