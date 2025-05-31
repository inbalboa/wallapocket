import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const WallapocketPrefsWidget = GObject.registerClass(
class WallapocketPrefsWidget extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Wallapocket Settings'),
            icon_name: 'bookmark-new-symbolic',
        });
        
        this._settings = settings;
        this._buildUI();
    }

    _buildUI() {
        // Server Configuration Group
        const serverGroup = new Adw.PreferencesGroup({
            title: _('Server Configuration'),
            description: _('Configure your Wallabag server connection'),
        });
        this.add(serverGroup);
        
        // Server URL
        const serverUrlRow = new Adw.EntryRow({
            title: _('Server URL'),
            text: this._settings.get_string('server-url'),
        });
        serverUrlRow.connect('changed', () => {
            this._settings.set_string('server-url', serverUrlRow.get_text());
        });
        serverGroup.add(serverUrlRow);
        
        // Client ID
        const clientIdRow = new Adw.EntryRow({
            title: _('Client ID'),
            text: this._settings.get_string('client-id'),
        });
        clientIdRow.connect('changed', () => {
            this._settings.set_string('client-id', clientIdRow.get_text());
        });
        serverGroup.add(clientIdRow);
        
        // Client Secret
        const clientSecretRow = new Adw.PasswordEntryRow({
            title: _('Client Secret'),
            text: this._settings.get_string('client-secret'),
        });
        clientSecretRow.connect('changed', () => {
            this._settings.set_string('client-secret', clientSecretRow.get_text());
        });
        serverGroup.add(clientSecretRow);
        
        // Authentication Group
        const authGroup = new Adw.PreferencesGroup({
            title: _('Authentication'),
            description: _('Your Wallabag credentials'),
        });
        this.add(authGroup);
        
        // Username
        const usernameRow = new Adw.EntryRow({
            title: _('Username'),
            text: this._settings.get_string('username'),
        });
        usernameRow.connect('changed', () => {
            this._settings.set_string('username', usernameRow.get_text());
        });
        authGroup.add(usernameRow);
        
        // Password
        const passwordRow = new Adw.PasswordEntryRow({
            title: _('Password'),
            text: this._settings.get_string('password'),
        });
        passwordRow.connect('changed', () => {
            this._settings.set_string('password', passwordRow.get_text());
        });
        authGroup.add(passwordRow);
        
        // Behavior Group
        const behaviorGroup = new Adw.PreferencesGroup({
            title: _('Behavior'),
            description: _('Configure extension behavior'),
        });
        this.add(behaviorGroup);
        
        // Auto-refresh interval
        const refreshRow = new Adw.SpinRow({
            title: _('Auto-refresh interval (minutes)'),
            subtitle: _('How often to refresh the articles list (0 = disabled)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 60,
                step_increment: 1,
                page_increment: 5,
                value: this._settings.get_int('refresh-interval'),
            }),
        });
        refreshRow.connect('changed', () => {
            this._settings.set_int('refresh-interval', refreshRow.get_value());
        });
        behaviorGroup.add(refreshRow);
        
        // Show notifications
        const notificationsRow = new Adw.SwitchRow({
            title: _('Show notifications'),
            subtitle: _('Show notifications when articles are saved'),
            active: this._settings.get_boolean('show-notifications'),
        });
        notificationsRow.connect('notify::active', () => {
            this._settings.set_boolean('show-notifications', notificationsRow.get_active());
        });
        behaviorGroup.add(notificationsRow);
        
        // Max articles in menu
        const maxArticlesRow = new Adw.SpinRow({
            title: _('Maximum articles in menu'),
            subtitle: _('Number of recent articles to show in the panel menu (please note, that this applies only to the display - all articles will be retrieved from the server to show the correct total number)'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 20,
                step_increment: 1,
                page_increment: 5,
                value: this._settings.get_int('max-articles'),
            }),
        });
        maxArticlesRow.connect('changed', () => {
            this._settings.set_int('max-articles', maxArticlesRow.get_value());
        });
        behaviorGroup.add(maxArticlesRow);
    }
});

export default class WallapocketPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new WallapocketPrefsWidget(settings);
        window.add(page);
    }
}
