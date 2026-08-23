// SPDX-License-Identifier: GPL-3.0-or-later

import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {AboutPage} from './prefs/about.js';
import {SettingsPage} from './prefs/settings.js';

export default class WallapocketPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        const iconPath = `${this.path}/icons`;
        if (!iconTheme.get_search_path().includes(iconPath))
            iconTheme.add_search_path(iconPath);

        window.add(new SettingsPage(this.getSettings()));
        window.add(new AboutPage(this.metadata));
    }
}
