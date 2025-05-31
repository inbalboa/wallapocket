# Wallapocket - Wallabag GNOME Shell Extension

A GNOME Shell extension that integrates with Wallabag, allowing you to quickly save links and view your saved articles directly from the top panel.

## Features

- **Quick Save**: Save URLs to Wallabag with a simple dialog
- **Recent Articles**: View your most recent saved articles in the panel menu
- **One-click Access**: Click on articles to open them in your default browser
- **Configurable Settings**: Set up your Wallabag server, credentials, and preferences
- **Auto-refresh**: Automatically refresh the articles list at configurable intervals

## Installation

1. Clone or download this repository
2. Copy the extension to your extensions directory:
   ```bash
   make install
   ```
3. Restart GNOME Shell
4. Enable the extension in GNOME Extensions app

## Configuration

Before using the extension, you need to configure your Wallabag connection:

1. Open the extension settings (via the panel menu or GNOME Extensions app)
2. Enter your Wallabag server details:
   - **Server URL**: Your Wallabag instance URL (e.g., https://app.wallabag.it)
   - **Client ID**: OAuth client ID from Wallabag
   - **Client Secret**: OAuth client secret from Wallabag
   - **Username**: Your Wallabag username
   - **Password**: Your Wallabag password

### Getting OAuth Credentials

To get your OAuth credentials:

1. Log into your Wallabag instance
2. Go to Settings → API clients management
3. Create a new client
4. Use the generated Client ID and Client Secret in the extension settings

## Usage

- **Save a link**: Click the extension icon and select "Quick Save URL"
- **View articles**: Click the extension icon to see your recent articles
- **Open article**: Click on any article in the menu to open it
- **Refresh**: Use "Refresh Articles" to manually update the list
- **Settings**: Access extension settings from the menu

## Requirements

- GNOME Shell 48+
- Wallabag server with API access
- Network connectivity to your Wallabag instance

## File Structure

```
wallapocket@inbalboa.github.io/
├── extension.js          # Main extension code
├── wallabagAPI.js       # Wallabag API integration
├── prefs.js             # Settings/preferences UI
├── metadata.json        # Extension metadata
├── schemas/             # GSettings schema
│   └── org.gnome.shell.extensions.wallapocket.gschema.xml
├── Makefile            # Build and installation scripts
└── README.md           # This file
```

## Development

To contribute or modify the extension:

1. Make your changes
2. Test with `make install`
3. Submit a pull request

## License

This extension is released under the GNU GPLv3 License.

## Support

For issues and support, please visit the project repository or create an issue.
