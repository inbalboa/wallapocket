// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const PROJECT_ICON = 'wallapocket-logo';
const EXTERNAL_LINK_ICON = 'adw-external-link-symbolic';

export const AboutPage = GObject.registerClass(
class WallapocketAboutPage extends Adw.PreferencesPage {
    _init(metadata) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic',
        });

        this.add(this._buildHeaderGroup(metadata));
        this.add(this._buildInfoGroup(metadata));
        this.add(this._buildLicenseGroup());
    }

    _buildHeaderGroup(metadata) {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 10,
            margin_bottom: 10,
            hexpand: false,
            vexpand: false,
        });

        box.append(new Gtk.Image({
            margin_bottom: 15,
            icon_name: PROJECT_ICON,
            pixel_size: 100,
        }));

        box.append(new Gtk.Label({
            label: `<span size="large"><b>${metadata.name}</b></span>`,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.FILL,
        }));

        box.append(new Gtk.Label({
            label: _('Displays your Wallabag articles'),
            hexpand: false,
            vexpand: false,
            margin_bottom: 5,
        }));

        const group = new Adw.PreferencesGroup();
        group.add(box);
        return group;
    }

    _buildInfoGroup(metadata) {
        const group = new Adw.PreferencesGroup();
        const projectUrl = metadata.url;

        group.add(this._buildLabelRow(_('Wallapocket Version'), metadata['version-name'] ?? _('unknown')));
        group.add(this._buildLabelRow(_('GNOME Version'), Config.PACKAGE_VERSION.toString()));
        group.add(this._buildLabelRow(_('Made with ❤️ for the GNOME community by'), 'Serhiy Shliapuhin'));
        group.add(this._buildLinkRow('GitHub', projectUrl));
        group.add(this._buildLinkRow(_('Contributors'), `${projectUrl}/graphs/contributors`));

        return group;
    }

    _buildLabelRow(title, value) {
        const row = new Adw.ActionRow({title});
        row.add_suffix(new Gtk.Label({label: value}));
        return row;
    }

    _buildLinkRow(title, uri) {
        const row = new Adw.ActionRow({title});
        row.add_suffix(new Gtk.LinkButton({
            icon_name: EXTERNAL_LINK_ICON,
            uri,
        }));
        return row;
    }

    _buildLicenseGroup() {
        const licenseLabel = _('This project is licensed under the GPL-3.0-or-later License.');
        const urlLabel = _('See the %sLicense%s for details.')
            .format('<a href="https://www.gnu.org/licenses/gpl.txt">', '</a>');

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END,
            vexpand: true,
            margin_top: 5,
            margin_bottom: 10,
        });
        box.append(new Gtk.Label({
            label: `<span size="small">${licenseLabel}\n${urlLabel}</span>`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        }));

        const group = new Adw.PreferencesGroup();
        group.add(box);
        return group;
    }
});
