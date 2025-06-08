# Wallapocket

A GNOME Shell extension that provides quick access to your Wallabag articles directly from your desktop panel.

## Features

- Quick access to your Wallabag articles from the GNOME panel
- Auto-refresh articles at configurable intervals
- Quick save new articles with optional title
- Article management
- Configurable notifications

## Installation

### Manual Installation

1. Clone this repository and install the extension:
   ```sh
   git clone https://github.com/inbalboa/wallapocket.git
   cd wallapocket
   make install
2. Restart GNOME Shell
3. Enable the extension in GNOME Extensions app

## Configuration

1. Open GNOME Extensions app
2. Find Wallapocket and click the settings icon
3. Configure the following settings:
   - Wallabag server URL
   - API credentials (Client ID, Client Secret)
   - Username and password
   - Refresh interval
   - Maximum number of articles to display
   - Notification preferences
   - Article action buttons visibility

## Usage

### Panel Menu

- Click the Wallapocket icon in the panel to open the menu
- View your recent articles
- Click on an article to open it in your default browser
- Use action buttons to manage articles:
  - Archive/Unarchive
  - Star/Unstar
  - Copy URL
  - Delete
  - Edit title

### Quick Save

1. Click the "Quick save" option in the menu
2. Enter the URL of the article you want to save
3. Optionally provide a custom title
4. Click "Save" to add the article to your Wallabag instance

## Requirements

- GNOME Shell 48 or later
- A Wallabag instance (self-hosted or wallabag.it)
- API credentials from your Wallabag instance

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

[Wallabag](https://www.wallabag.org/) for the nice read-it-later service which I can use after the Pocket sunset.

