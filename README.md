# Gladiatus Market Demo

Small standalone Chrome extension demo for preparing Gladiatus healing items for market sale.

## Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this folder: `market-demo-extension`.

## Update

Run `update-from-main.bat` to download the latest files from the `main` branch.

- Put `update-from-main.bat` inside the bot extension folder before running it. If the folder does not look like the bot folder, the updater shows a warning and asks for confirmation before it allows update options.
- Press `1` to use Git. This fetches `main` and restores tracked files to that version.
- Press `2` to download the latest ZIP from GitHub and copy the files into this folder. This option does not require Git.
- Press `Q` to exit.
- After updating, reload the extension on `chrome://extensions`.

The updater is meant for normal extension users, not local development. In a Git checkout, it restores tracked files to the latest `main` version, so local edits to extension files will be replaced.

## Use

1. Open the Gladiatus market page.
2. Open the inventory bag that has healing items.
3. Click the extension icon.
4. Use `Scan Current Bag` to preview detected healing items.
5. Use `Put First Healing Item In Box` to drag one item into the market slot, set duration, and fill price.
6. Check the offer manually.
7. Use `Submit Prepared Offer` only when you are ready to list the item.

## Page Controls

The extension also injects a `Market demo` control bar above the market sell container.

1. Choose base price, markup, and duration.
2. Click `Save settings` to keep those defaults for future market page loads.
3. Click `Mark items`.
4. Hover healing items to preview the calculated market price with the current settings.
5. Click healing items in the visible inventory bag to toggle them for sale.
6. Click `Put for sale`.
7. The demo lists one marked item, waits for the market page reload, then continues with the next marked item.
8. Click `Clear` to stop the queue and remove the current selection.

Marked items are stored only in the current tab session.
Saved market settings are stored in the browser for future sessions. If a sale queue is active, its settings are restored instead of the saved defaults.

The default price uses:

```text
estimated merchant price = item Value / 0.276445
market price = ceil(estimated merchant price * (1 + markup) / (1 - fee rate))
```

Default settings are vendor-price base, `30%` markup, and `24 h` duration.

The base price dropdown has two modes:

```text
1 restored health = 1 gold, with a minimum base of 999 gold
vendor price = current calibrated vendor price formula
```

The page console also exposes:

```js
await window.gladiatusMarketDemo.getVisibleMarketHealingItems()
await window.gladiatusMarketDemo.prepareFirstMarketHealingOffer()
await window.gladiatusMarketDemo.submitPreparedMarketOffer()
```
