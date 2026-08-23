// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const SettingsPage = GObject.registerClass(
class WallapocketSettingsPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Settings'),
            icon_name: 'settings-symbolic',
        });

        this._settings = settings;

        this.add(this._buildServerGroup());
        this.add(this._buildAuthGroup());
        this.add(this._buildBehaviorGroup());
        this.add(this._buildButtonsGroup());
    }

    _buildServerGroup() {
        const group = new Adw.PreferencesGroup({
            title: _('Server Configuration'),
            description: _('Configure your Wallabag server connection'),
        });

        group.add(this._buildEntryRow('server-url', _('Wallabag server URL')));
        group.add(this._buildEntryRow('client-id', _('Client ID')));
        group.add(this._buildEntryRow('client-secret', _('Client Secret'), true));

        return group;
    }

    _buildAuthGroup() {
        const group = new Adw.PreferencesGroup({
            title: _('Authentication'),
            description: _('Your Wallabag credentials'),
        });

        group.add(this._buildEntryRow('username', _('Username')));
        group.add(this._buildEntryRow('password', _('Password'), true));

        return group;
    }

    _buildBehaviorGroup() {
        const group = new Adw.PreferencesGroup({
            title: _('Behavior'),
            description: _('Configure extension behavior'),
        });

        group.add(this._buildSpinRow('refresh-interval', {
            title: _('Auto-refresh interval'),
            subtitle: _('How often to refresh the articles in minutes (0 to disable)'),
            lower: 0,
            upper: 60,
        }));

        group.add(this._buildSwitchRow('show-notifications', {
            title: _('Show notifications'),
            subtitle: _('Be verbose - show notifications about adding new article, deleting, editing, etc'),
        }));

        group.add(this._buildSwitchRow('show-new-article-notifications', {
            title: _('Show new article notifications'),
            subtitle: _('Show notifications when new articles are found'),
        }));

        group.add(this._buildSpinRow('max-articles', {
            title: _('Maximum number of articles'),
            subtitle: _('Maximum number of articles to show in the menu. All articles are still ' +
                'retrieved from the server to show the correct total count'),
            lower: 1,
            upper: 20,
        }));

        group.add(this._buildSwitchRow('re-save-unsuccessfully-saved-articles', {
            title: _('Re-save unsuccessfully saved articles'),
            subtitle: _('Workaround for a Wallabag instance banned by the site while fetching content. ' +
                'The broken article is removed from Wallabag, then re-added with a locally given title'),
        }));

        return group;
    }

    _buildButtonsGroup() {
        const group = new Adw.PreferencesGroup({
            title: _('Article Buttons'),
            description: _('Configure which action buttons to show for each article'),
        });

        group.add(this._buildSwitchRow('show-archive-button', {
            title: _('Show read/unread button'),
            subtitle: _('Allow marking articles as read/unread'),
        }));

        group.add(this._buildSwitchRow('show-star-button', {
            title: _('Show star/unstar button'),
            subtitle: _('Allow adding/removing articles from favorites'),
        }));

        group.add(this._buildSwitchRow('show-copy-button', {
            title: _('Show copy button'),
            subtitle: _('Allow copying article URLs to clipboard'),
        }));

        group.add(this._buildSwitchRow('show-delete-button', {
            title: _('Show delete button'),
            subtitle: _('Allow deleting articles'),
        }));

        group.add(this._buildSwitchRow('show-edit-title-button', {
            title: _('Show edit title button'),
            subtitle: _('Allow editing article titles'),
        }));

        return group;
    }

    _buildEntryRow(key, title, isPassword = false) {
        const row = isPassword
            ? new Adw.PasswordEntryRow({title})
            : new Adw.EntryRow({title});
        this._settings.bind(key, row, 'text', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    _buildSwitchRow(key, {title, subtitle}) {
        const row = new Adw.SwitchRow({title, subtitle});
        this._settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    _buildSpinRow(key, {title, subtitle, lower, upper}) {
        const row = new Adw.SpinRow({
            title,
            subtitle,
            adjustment: new Gtk.Adjustment({
                lower,
                upper,
                step_increment: 1,
                page_increment: 5,
                value: this._settings.get_int(key),
            }),
        });
        row.connect('notify::value', () => this._settings.set_int(key, row.get_value()));
        return row;
    }
});
