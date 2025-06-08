import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class WallapocketPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        if (!iconTheme.get_search_path().includes(`${this.path}/icons`))
            iconTheme.add_search_path(`${this.path}/icons`);

        const page = new WallapocketPrefsWidget(this.getSettings());
        window.add(page);

        const aboutPage = new AboutPage(this.metadata);
        window.add(aboutPage);
    }
}

const WallapocketPrefsWidget = GObject.registerClass(class WallapocketPrefsWidget extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Settings'),
            icon_name: 'settings-symbolic',
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
            title: _('Wallabag server URL'),
            text: this._settings.get_string('server-url'),
        });
        serverUrlRow.connect('changed', () => this._settings.set_string('server-url', serverUrlRow.get_text()));
        serverGroup.add(serverUrlRow);

        // Client ID
        const clientIdRow = new Adw.EntryRow({
            title: _('Client ID'),
            text: this._settings.get_string('client-id'),
        });
        clientIdRow.connect('changed', () => this._settings.set_string('client-id', clientIdRow.get_text()));
        serverGroup.add(clientIdRow);

        // Client Secret
        const clientSecretRow = new Adw.PasswordEntryRow({
            title: _('Client Secret'),
            text: this._settings.get_string('client-secret'),
        });
        clientSecretRow.connect('changed', () => this._settings.set_string('client-secret', clientSecretRow.get_text()));
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
        usernameRow.connect('changed', () => this._settings.set_string('username', usernameRow.get_text()));
        authGroup.add(usernameRow);

        // Password
        const passwordRow = new Adw.PasswordEntryRow({
            title: _('Password'),
            text: this._settings.get_string('password'),
        });
        passwordRow.connect('changed', () => this._settings.set_string('password', passwordRow.get_text()));
        authGroup.add(passwordRow);

        // Behavior Group
        const behaviorGroup = new Adw.PreferencesGroup({
            title: _('Behavior'),
            description: _('Configure extension behavior'),
        });
        this.add(behaviorGroup);

        // Auto-refresh interval
        const refreshRow = new Adw.SpinRow({
            title: _('Auto-refresh interval'),
            subtitle: _('How often to refresh the articles in minutes (0 to disable)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 60,
                step_increment: 1,
                page_increment: 5,
                value: this._settings.get_int('refresh-interval'),
            }),
        });
        refreshRow.connect('changed', () => this._settings.set_int('refresh-interval', refreshRow.get_value()));
        behaviorGroup.add(refreshRow);

        // Show notifications
        const notificationsRow = new Adw.SwitchRow({
            title: _('Show notifications'),
            subtitle: _('Be verbose - show notifications about adding new article, deleting, editing, etc'),
            active: this._settings.get_boolean('show-notifications'),
        });
        notificationsRow.connect('notify::active', () => this._settings.set_boolean('show-notifications', notificationsRow.get_active()));
        behaviorGroup.add(notificationsRow);

        // Show new article notifications
        const notificationsNewArticlesRow = new Adw.SwitchRow({
            title: _('Show new article notifications'),
            subtitle: _('Show notifications when new articles are found'),
            active: this._settings.get_boolean('show-new-article-notifications'),
        });
        notificationsNewArticlesRow.connect('notify::active', () => this._settings.set_boolean('show-new-article-notifications', notificationsNewArticlesRow.get_active()));
        behaviorGroup.add(notificationsNewArticlesRow);

        // Max articles in menu
        const maxArticlesRow = new Adw.SpinRow({
            title: _('Maximum number of articles'),
            subtitle: _('Maximum number of articles to show in the menu (please note, that this applies only to the display; all articles will be retrieved from the server anyway to show the correct total number)'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 20,
                step_increment: 1,
                page_increment: 5,
                value: this._settings.get_int('max-articles'),
            }),
        });
        maxArticlesRow.connect('changed', () => this._settings.set_int('max-articles', maxArticlesRow.get_value()));
        behaviorGroup.add(maxArticlesRow);

        // Re-save unsuccessfully saved articles
        const reSaveArticlesRow = new Adw.SwitchRow({
            title: _('Re-save unsuccessfully saved articles'),
            subtitle: _('Workaround when the Wallabag instanse got banned by the site while trying to get content. Broken article will be removed from the Wallabag, then new article with the locally given title will be added'),
            active: this._settings.get_boolean('re-save-unsuccessfully-saved-articles'),
        });
        reSaveArticlesRow.connect('notify::active', () => this._settings.set_boolean('re-save-unsuccessfully-saved-articles', reSaveArticlesRow.get_active()));
        behaviorGroup.add(reSaveArticlesRow);

        // Button visibility group
        const buttonsGroup = new Adw.PreferencesGroup({
            title: _('Article Buttons'),
            description: _('Configure which action buttons to show for each article'),
        });
        this.add(buttonsGroup);

        // Show archive button
        const showArchiveRow = new Adw.SwitchRow({
            title: _('Show read/unread button'),
            subtitle: _('Allow marking articles as read/unread'),
            active: this._settings.get_boolean('show-archive-button'),
        });
        showArchiveRow.connect('notify::active', () => this._settings.set_boolean('show-archive-button', showArchiveRow.get_active()));
        buttonsGroup.add(showArchiveRow);

        // Show star button
        const showStarRow = new Adw.SwitchRow({
            title: _('Show star/unstar button'),
            subtitle: _('Allow adding/removing articles from favorites'),
            active: this._settings.get_boolean('show-star-button'),
        });
        showStarRow.connect('notify::active', () => this._settings.set_boolean('show-star-button', showStarRow.get_active()));
        buttonsGroup.add(showStarRow);

        // Show copy button
        const showCopyRow = new Adw.SwitchRow({
            title: _('Show copy button'),
            subtitle: _('Allow copying article URLs to clipboard'),
            active: this._settings.get_boolean('show-copy-button'),
        });
        showCopyRow.connect('notify::active', () => this._settings.set_boolean('show-copy-button', showCopyRow.get_active()));
        buttonsGroup.add(showCopyRow);

        // Show delete button
        const showDeleteRow = new Adw.SwitchRow({
            title: _('Show delete button'),
            subtitle: _('Allow deleting articles'),
            active: this._settings.get_boolean('show-delete-button'),
        });
        showDeleteRow.connect('notify::active', () => this._settings.set_boolean('show-delete-button', showDeleteRow.get_active()));
        buttonsGroup.add(showDeleteRow);

        // Show edit title button
        const showEditTitleRow = new Adw.SwitchRow({
            title: _('Show edit title button'),
            subtitle: _('Allow editing article titles'),
            active: this._settings.get_boolean('show-edit-title-button'),
        });
        showEditTitleRow.connect('notify::active', () => this._settings.set_boolean('show-edit-title-button', showEditTitleRow.get_active()));
        buttonsGroup.add(showEditTitleRow);
    }
});


export const AboutPage = GObject.registerClass(class WallapocketAboutPage extends Adw.PreferencesPage {
    _init(metadata) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic',
        });

        const PROJECT_IMAGE = 'wallapocket-logo';
        const EXTERNAL_LINK_ICON = 'adw-external-link-symbolic';

        const wallapocketGroup = new Adw.PreferencesGroup();
        const wallapocketBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 10,
            margin_bottom: 10,
            hexpand: false,
            vexpand: false,
        });

        const projectImage = new Gtk.Image({
            margin_bottom: 15,
            icon_name: PROJECT_IMAGE,
            pixel_size: 100,
        });

        const wallapocketLabel = new Gtk.Label({
            label: `<span size="large"><b>${_('Wallapocket')}</b></span>`,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.FILL,
        });

        const projectDescriptionLabel = new Gtk.Label({
            label: _('Displays your Wallabag articles'),
            hexpand: false,
            vexpand: false,
            margin_bottom: 5,
        });

        wallapocketBox.append(projectImage);
        wallapocketBox.append(wallapocketLabel);
        wallapocketBox.append(projectDescriptionLabel);
        wallapocketGroup.add(wallapocketBox);

        this.add(wallapocketGroup);
        // -----------------------------------------------------------------------

        // Extension/OS Info Group------------------------------------------------
        const extensionInfoGroup = new Adw.PreferencesGroup();
        const wallapocketVersionRow = new Adw.ActionRow({
            title: _('Wallapocket Version'),
        });
        const releaseVersion = metadata['version-name'] ? metadata['version-name'] : 'unknown';
        wallapocketVersionRow.add_suffix(new Gtk.Label({
            label: `${releaseVersion}`,
        }));

        const gnomeVersionRow = new Adw.ActionRow({
            title: _('GNOME Version'),
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: `${Config.PACKAGE_VERSION.toString()}`,
        }));

        const createdByRow = new Adw.ActionRow({
            title: _('Made with ❤️ for the GNOME community by'),
        });
        createdByRow.add_suffix(new Gtk.Label({
            label: 'Serhiy Shliapuhin',
        }));

        const githubLinkRow = new Adw.ActionRow({
            title: 'GitHub',
        });
        githubLinkRow.add_suffix(new Gtk.LinkButton({
            icon_name: EXTERNAL_LINK_ICON,
            uri: 'https://github.com/inbalboa/gnome-wallapocket',
        }));

        const contributorRow = new Adw.ActionRow({
            title: _('Contributors'),
        });
        contributorRow.add_suffix(new Gtk.LinkButton({
            icon_name: EXTERNAL_LINK_ICON,
            uri: 'https://github.com/inbalboa/gnome-wallapocket/graphs/contributors',
        }));

        extensionInfoGroup.add(wallapocketVersionRow);
        extensionInfoGroup.add(gnomeVersionRow);
        extensionInfoGroup.add(createdByRow);
        extensionInfoGroup.add(githubLinkRow);
        extensionInfoGroup.add(contributorRow);

        this.add(extensionInfoGroup);
        // -----------------------------------------------------------------------

        const licenseLabel = _('This project is licensed under the GPL-3.0 License.');
        const urlLabel = _('See the %sLicense%s for details.').format('<a href="https://www.gnu.org/licenses/gpl.txt">', '</a>');

        const gnuSoftwareGroup = new Adw.PreferencesGroup();
        const gnuSofwareLabel = new Gtk.Label({
            label: `<span size="small">${licenseLabel}\n${urlLabel}</span>`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });

        const gnuSofwareLabelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END,
            vexpand: true,
            margin_top: 5,
            margin_bottom: 10,
        });
        gnuSofwareLabelBox.append(gnuSofwareLabel);
        gnuSoftwareGroup.add(gnuSofwareLabelBox);
        this.add(gnuSoftwareGroup);
    }
});
