import GObject from 'gi://GObject';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

export const DeleteConfirmationDialog = GObject.registerClass(
class DeleteConfirmationDialog extends ModalDialog.ModalDialog {
    _init(articleTitle, onConfirm) {
        super._init({
            styleClass: 'delete-confirmation-dialog'
        });

        this._onConfirm = onConfirm;

        let content = new Dialog.MessageDialogContent({
            title: 'Delete confirmation',
            description: `Permanently Delete "${articleTitle}"?\n\nThis action cannot be undone.`
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
                action: () => this._onDelete(),
                default: true,
            },
        ]);
    }

    _onDelete() {
        this.close();
        this._onConfirm();
    }
});
