// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class ExtensionIcons {
    constructor(extensionDir) {
        this._extensionDir = extensionDir;
        this._iconTheme = new St.IconTheme();
    }

    getCustomIcon(iconName) {
        if (this._iconTheme.has_icon(iconName))
            return Gio.ThemedIcon.new_with_default_fallbacks(iconName);

        const themeAwareIconName = `${iconName}-${this._isLightTheme() ? 'dark' : 'light'}`;
        const iconPath = this._extensionDir.get_child('icons').get_child(`${themeAwareIconName}.svg`).get_path();
        return Gio.icon_new_for_string(iconPath);
    }

    _isLightTheme() {
        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        const stylesheetUri = theme.get_default_stylesheet()?.get_uri() ?? '';
        const sessionStylesheet = Main.sessionMode.stylesheetName ?? '';

        return stylesheetUri.toLowerCase().includes('light') ||
               sessionStylesheet.toLowerCase().includes('light');
    }

    destroy() {
        this._iconTheme = null;
        this._extensionDir = null;
    }
}
