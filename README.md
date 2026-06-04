# Gladiatus Market Demo

Small standalone Chrome extension demo for preparing Gladiatus healing items for market sale.

## Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this folder: `market-demo-extension`.

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
2. Click `Mark items`.
3. Click healing items in the visible inventory bag to toggle them for sale.
4. Click `Put for sale`.
5. The demo lists one marked item, waits for the market page reload, then continues with the next marked item.
6. Click `Clear` to stop the queue and remove the current selection.

Marked items are stored only in the current tab session.

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
