// SPDX-License-Identifier: GPL-3.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ExtensionIcons} from './icons.js';
import {WallapocketIndicator} from './indicator.js';

export default class WallapocketExtension extends Extension {
    enable() {
        this._icons = new ExtensionIcons(this.dir);
        this._indicator = new WallapocketIndicator(this, this._icons);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        this._icons.destroy();
        this._icons = null;
    }
}
