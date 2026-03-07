```
 ██████╗  ██████╗  ██████╗ ██████╗ ██╗     ███████╗    ██████╗  ██████╗  ██████╗███████╗
██╔════╝ ██╔═══██╗██╔═══██╗██╔════╝ ██║     ██╔════╝    ██╔══██╗██╔═══██╗██╔════╝██╔════╝
██║  ███╗██║   ██║██║   ██║██║  ███╗██║     █████╗      ██║  ██║██║   ██║██║     ███████╗
██║   ██║██║   ██║██║   ██║██║   ██║██║     ██╔══╝      ██║  ██║██║   ██║██║     ╚════██║
╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝███████╗███████╗    ██████╔╝╚██████╔╝╚██████╗███████║
 ╚═════╝  ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝╚══════╝    ╚═════╝  ╚═════╝  ╚═════╝╚══════╝

████████╗ ██████╗  ██████╗ ██╗     ██████╗  █████╗ ██████╗
╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔══██╗██╔══██╗██╔══██╗
   ██║   ██║   ██║██║   ██║██║     ██████╔╝███████║██████╔╝
   ██║   ██║   ██║██║   ██║██║     ██╔══██╗██╔══██║██╔══██╗
   ██║   ╚██████╔╝╚██████╔╝███████╗██████╔╝██║  ██║██║  ██║
   ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝

███████╗███╗   ██╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗███████╗██████╗
██╔════╝████╗  ██║██║  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝██╔══██╗
█████╗  ██╔██╗ ██║███████║███████║██╔██╗ ██║██║     █████╗  ██████╔╝
██╔══╝  ██║╚██╗██║██╔══██║██╔══██║██║╚██╗██║██║     ██╔══╝  ██╔══██╗
███████╗██║ ╚████║██║  ██║██║  ██║██║ ╚████║╚██████╗███████╗██║  ██║
╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝
```

A Chrome extension that brings back missing formatting buttons to the Google Docs toolbar.

## Features

- **Strikethrough** — One-click ~~strikethrough~~ right from the toolbar
- **Change Case** — Dropdown with UPPERCASE, lowercase, and Title Case
- **Customizable** — Show/hide buttons via the extension popup settings
- **Native Feel** — Buttons blend seamlessly into the Google Docs toolbar

## Installation

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. Open any Google Doc — the buttons appear after Bold/Italic/Underline

## How It Works

The extension injects toolbar buttons directly into Google Docs' UI using a MutationObserver to detect and hook into the toolbar. Formatting commands are executed by programmatically navigating Google Docs' native menu system (Format > Text > ...), cloaked invisibly so the experience feels instant.

## Project Structure

```
strikethrough-docs/
  manifest.json        Manifest V3 configuration
  content/
    content.js         Toolbar injection & menu automation
    content.css        Button styles matching native toolbar
  popup/
    popup.html         Settings UI
    popup.js           Toggle persistence
    popup.css          Popup styling
  icons/               Extension icons (16/48/128px)
```

## Tech Stack

- Vanilla JavaScript — no build step, no dependencies
- Chrome Extension Manifest V3
- Google Closure Library menu automation (cloaked)

## Author

**Aviran Revach**

## License

MIT
