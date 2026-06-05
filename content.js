(() => {
  if (window.gladiatusMarketDemoContentLoaded) {
    return;
  }

  window.gladiatusMarketDemoContentLoaded = true;

  const INVENTORY_COLUMNS = 8;
  const INVENTORY_ROWS = 5;
  const MARKET_DURATION_FEE_RATE = {
    "1": 0.02,
    "2": 0.03,
    "3": 0.04
  };
  const MARKET_DEFAULT_DURATION = "3";
  const MARKET_DEFAULT_MARKUP = 0.30;
  const MARKET_SELL_BACK_RATIO = 0.276445;
  const MARKET_DEMO_SELECTION_KEY = "gladiatusMarketDemoSelection";
  const MARKET_DEMO_QUEUE_KEY = "gladiatusMarketDemoSaleQueue";
  const MARKET_SETTINGS_KEY = "gladiatusMarketSettings";
  const MARKET_DEMO_CONTROLS_ID = "gladiatus-market-demo-controls";
  const MARKET_DEMO_STYLE_ID = "gladiatus-market-demo-style";
  const MARKET_DEMO_PRICE_PREVIEW_ID = "gladiatus-market-demo-price-preview";
  const MARKET_INVENTORY_PINNED_CLASS = "gladiatus-market-demo-inventory-pinned";
  const MARKET_PINNED_INVENTORY_ELEMENT_CLASS = "gladiatus-market-demo-pinned-inventory";
  const MARKET_PINNED_SELL_ELEMENT_CLASS = "gladiatus-market-demo-pinned-sell";
  const MARKET_HEALING_ITEM_BASIS = new Set([
    "food"
  ]);
  let marketDemoMarkMode = false;
  let marketDemoQueueRunning = false;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.source !== "gladiatus-market-demo-popup") {
      return false;
    }

    handleMarketDemoMessage(message)
      .then(result => sendResponse({ ok: true, result }))
      .catch(error => sendResponse({
        ok: false,
        error: error?.message || String(error)
      }));

    return true;
  });

  async function handleMarketDemoMessage(message) {
    const method = window.gladiatusMarketDemo?.[message.method];

    if (typeof method !== "function") {
      throw new Error(`Unknown market demo method: ${message.method}`);
    }

    return method(...(message.args || []));
  }

  function isMarketPage() {
    try {
      return new URL(window.location.href).searchParams.get("mod") === "market";
    } catch {
      return false;
    }
  }

  function getMarketLink() {
    return document.querySelector('a.menuitem[href*="mod=market"]')?.href || null;
  }

  function getInventoryBox() {
    return document.querySelector("#inv.inventory_box, #inv.ui-droppable-grid");
  }

  function getInventoryPinContainer() {
    const inventory = getInventoryBox();

    return inventory?.closest?.(".inventoryBox") || inventory;
  }

  function getMarketSellContainer() {
    return document.querySelector("#market_sell");
  }

  function getMarketSellDropTarget() {
    return document.querySelector("#market_sell .ui-droppable");
  }

  function getMarketSellForm() {
    return document.querySelector("#sellForm");
  }

  function getMarketPriceInput() {
    return document.querySelector("#sellForm #preis, #preis");
  }

  function getMarketDurationSelect() {
    return document.querySelector("#sellForm #dauer, #dauer");
  }

  function getMarketFeeElement() {
    return document.querySelector("#sellForm #marktgebuehren, #marktgebuehren");
  }

  function getMarketOfferButton() {
    return getMarketSellForm()?.querySelector('input[type="submit"][name="anbieten"]');
  }

  function initializeMarketDemoPageControls() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeMarketDemoPageControls, { once: true });
      return;
    }

    if (!isMarketPage()) {
      return;
    }

    installMarketDemoStyles();
    installMarketDemoControls();
    refreshMarketDemoSelectionHighlights();
    updateMarketDemoStatus();
    setTimeout(continueMarketDemoSaleQueue, 700);
  }

  function installMarketDemoStyles() {
    if (document.getElementById(MARKET_DEMO_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = MARKET_DEMO_STYLE_ID;
    style.textContent = `
      #${MARKET_DEMO_CONTROLS_ID} {
        margin: 8px 0 10px;
        padding: 8px;
        border: 1px solid #6f5434;
        background: #20150d;
        color: #f3e3c0;
        font: 12px Arial, sans-serif;
      }

      #${MARKET_DEMO_CONTROLS_ID} .market-demo-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin: 4px 0;
      }

      #${MARKET_DEMO_CONTROLS_ID} button,
      #${MARKET_DEMO_CONTROLS_ID} select,
      #${MARKET_DEMO_CONTROLS_ID} input {
        font: 12px Arial, sans-serif;
      }

      #${MARKET_DEMO_CONTROLS_ID} button {
        padding: 3px 7px;
        cursor: pointer;
      }

      #${MARKET_DEMO_CONTROLS_ID} input {
        width: 54px;
      }

      #gladiatus-market-demo-status {
        color: #f4d58a;
      }

      #${MARKET_DEMO_PRICE_PREVIEW_ID} {
        position: fixed;
        z-index: 99999;
        max-width: 220px;
        padding: 6px 8px;
        border: 1px solid #9c7a43;
        background: #1b120b;
        color: #f7e7c4;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
        font: 12px Arial, sans-serif;
        line-height: 1.35;
        pointer-events: none;
      }

      #${MARKET_DEMO_PRICE_PREVIEW_ID} strong {
        color: #ffd36a;
      }

      .gladiatus-market-demo-selected {
        outline: 2px solid #46d369 !important;
        box-shadow: 0 0 8px #46d369 !important;
      }

      .gladiatus-market-demo-marking #inv [data-tooltip][data-position-x][data-position-y] {
        cursor: crosshair !important;
      }

      .${MARKET_INVENTORY_PINNED_CLASS} .inventoryBox,
      .${MARKET_PINNED_INVENTORY_ELEMENT_CLASS} {
        position: fixed !important;
        top: 8px !important;
        left: 50% !important;
        right: auto !important;
        transform: translateX(-50%) !important;
        z-index: 10050 !important;
        width: 256px !important;
        min-width: 256px !important;
        max-width: 256px !important;
        background: transparent !important;
        border: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }

      .${MARKET_INVENTORY_PINNED_CLASS} .inventoryBox #inv,
      .${MARKET_PINNED_INVENTORY_ELEMENT_CLASS}#inv,
      .${MARKET_PINNED_INVENTORY_ELEMENT_CLASS} #inv {
        outline: 1px solid rgba(244, 213, 138, 0.75) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;
      }

      .${MARKET_INVENTORY_PINNED_CLASS} .inventoryBox #itemOptions,
      .${MARKET_INVENTORY_PINNED_CLASS} .inventoryBox .bag_buy_extend,
      .${MARKET_INVENTORY_PINNED_CLASS} .inventoryBox #show-item-info,
      .${MARKET_PINNED_INVENTORY_ELEMENT_CLASS} #itemOptions,
      .${MARKET_PINNED_INVENTORY_ELEMENT_CLASS} .bag_buy_extend,
      .${MARKET_PINNED_INVENTORY_ELEMENT_CLASS} #show-item-info {
        display: none !important;
      }

      .${MARKET_INVENTORY_PINNED_CLASS} #market_sell,
      .${MARKET_PINNED_SELL_ELEMENT_CLASS} {
        position: fixed !important;
        top: 8px !important;
        right: 8px !important;
        z-index: 10050 !important;
      }

      .${MARKET_INVENTORY_PINNED_CLASS} #market_sell .ui-droppable,
      .${MARKET_PINNED_SELL_ELEMENT_CLASS} .ui-droppable {
        outline: 1px solid rgba(244, 213, 138, 0.75) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function setMarketInventoryPinned(pinned) {
    document.documentElement.classList.toggle(
      MARKET_INVENTORY_PINNED_CLASS,
      Boolean(pinned)
    );
    getInventoryPinContainer()?.classList.toggle(
      MARKET_PINNED_INVENTORY_ELEMENT_CLASS,
      Boolean(pinned)
    );
    getMarketSellContainer()?.classList.toggle(
      MARKET_PINNED_SELL_ELEMENT_CLASS,
      Boolean(pinned)
    );
  }

  function installMarketDemoControls() {
    if (document.getElementById(MARKET_DEMO_CONTROLS_ID)) {
      return;
    }

    const sellSection = document.querySelector("#market_sell")?.closest("section")
      || getMarketSellForm();

    if (!sellSection?.parentNode) {
      return;
    }

    const controls = document.createElement("div");
    controls.id = MARKET_DEMO_CONTROLS_ID;
    controls.innerHTML = `
      <div class="market-demo-row">
        <strong>Market demo</strong>
        <button type="button" id="gladiatus-market-demo-mark">Mark items</button>
        <button type="button" id="gladiatus-market-demo-sale">Put for sale</button>
        <button type="button" id="gladiatus-market-demo-save">Save settings</button>
        <button type="button" id="gladiatus-market-demo-clear">Clear</button>
      </div>
      <div class="market-demo-row">
        <label>Base
          <select id="gladiatus-market-demo-pricing">
            <option value="health">1 HP = 1 gold</option>
            <option value="merchant" selected>Vendor price</option>
          </select>
        </label>
        <label>Markup
          <input id="gladiatus-market-demo-markup" type="number" min="0" max="5" step="0.05" value="0.30">
        </label>
        <label>Duration
          <select id="gladiatus-market-demo-duration">
            <option value="1">2 h</option>
            <option value="2">8 h</option>
            <option value="3" selected>24 h</option>
          </select>
        </label>
      </div>
      <div class="market-demo-row">
        <span id="gladiatus-market-demo-status"></span>
      </div>
    `;

    sellSection.parentNode.insertBefore(controls, sellSection);
    applySavedMarketDemoSettingsToControls();
    applyMarketDemoQueueOptionsToControls();
    document.getElementById("gladiatus-market-demo-mark")?.addEventListener("click", toggleMarketDemoMarkMode);
    document.getElementById("gladiatus-market-demo-sale")?.addEventListener("click", startSelectedMarketDemoSaleQueue);
    document.getElementById("gladiatus-market-demo-save")?.addEventListener("click", saveMarketDemoSettings);
    document.getElementById("gladiatus-market-demo-clear")?.addEventListener("click", clearMarketDemoSelectionAndQueue);
    document.addEventListener("click", handleMarketDemoInventoryClick, true);
    document.addEventListener("mouseover", handleMarketDemoInventoryPreviewMove, true);
    document.addEventListener("mousemove", handleMarketDemoInventoryPreviewMove, true);
    document.addEventListener("mouseout", handleMarketDemoInventoryPreviewOut, true);
  }

  function applySavedMarketDemoSettingsToControls() {
    if (getMarketDemoSaleQueue().active) {
      return;
    }

    applyMarketDemoSettingsToControls(getSavedMarketDemoSettings());
  }

  function applyMarketDemoQueueOptionsToControls() {
    const queue = getMarketDemoSaleQueue();

    if (!queue.active || !queue.options) {
      return;
    }

    const pricing = document.getElementById("gladiatus-market-demo-pricing");
    const markup = document.getElementById("gladiatus-market-demo-markup");
    const duration = document.getElementById("gladiatus-market-demo-duration");

    if (pricing && queue.options.pricingBasis) {
      pricing.value = queue.options.pricingBasis;
    }

    if (markup && Number.isFinite(Number(queue.options.markup))) {
      markup.value = String(queue.options.markup);
    }

    if (duration && queue.options.duration) {
      duration.value = String(queue.options.duration);
    }
  }

  function applyMarketDemoSettingsToControls(settings = {}) {
    const pricing = document.getElementById("gladiatus-market-demo-pricing");
    const markup = document.getElementById("gladiatus-market-demo-markup");
    const duration = document.getElementById("gladiatus-market-demo-duration");

    if (pricing && ["health", "merchant"].includes(settings.pricingBasis)) {
      pricing.value = settings.pricingBasis;
    }

    if (markup && Number.isFinite(Number(settings.markup))) {
      markup.value = String(Number(settings.markup));
    }

    if (duration && ["1", "2", "3"].includes(String(settings.duration))) {
      duration.value = String(settings.duration);
    }
  }

  function getSavedMarketDemoSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(MARKET_SETTINGS_KEY) || "{}");

      return {
        pricingBasis: ["health", "merchant"].includes(settings.pricingBasis)
          ? settings.pricingBasis
          : "merchant",
        markup: Number.isFinite(Number(settings.markup))
          ? Number(settings.markup)
          : MARKET_DEFAULT_MARKUP,
        duration: ["1", "2", "3"].includes(String(settings.duration))
          ? String(settings.duration)
          : MARKET_DEFAULT_DURATION
      };
    } catch {
      localStorage.removeItem(MARKET_SETTINGS_KEY);
      return {};
    }
  }

  function saveMarketDemoSettings() {
    const settings = getMarketDemoInlineOptions();

    localStorage.setItem(MARKET_SETTINGS_KEY, JSON.stringify(settings));
    updateMarketDemoStatus("Settings saved.");
  }

  function toggleMarketDemoMarkMode() {
    marketDemoMarkMode = !marketDemoMarkMode;
    document.documentElement.classList.toggle("gladiatus-market-demo-marking", marketDemoMarkMode);

    const button = document.getElementById("gladiatus-market-demo-mark");

    if (button) {
      button.textContent = marketDemoMarkMode ? "Stop marking" : "Mark items";
    }

    if (!marketDemoMarkMode) {
      hideMarketDemoPricePreview();
    }

    updateMarketDemoStatus(marketDemoMarkMode
      ? "Marking enabled. Click healing items in the visible bag."
      : "");
  }

  function handleMarketDemoInventoryPreviewMove(event) {
    if (!marketDemoMarkMode) {
      hideMarketDemoPricePreview();
      return;
    }

    const element = event.target?.closest?.("#inv [data-tooltip][data-position-x][data-position-y]");

    if (!element) {
      hideMarketDemoPricePreview();
      return;
    }

    const item = enrichMarketHealingItem(parseInventoryItemElement(element));

    if (!item?.isHealing || Number(item.estimatedSellValue) <= 0) {
      hideMarketDemoPricePreview();
      return;
    }

    showMarketDemoPricePreview(item, event);
  }

  function handleMarketDemoInventoryPreviewOut(event) {
    const element = event.target?.closest?.("#inv [data-tooltip][data-position-x][data-position-y]");
    const related = event.relatedTarget;

    if (!element || (related instanceof Node && element.contains(related))) {
      return;
    }

    hideMarketDemoPricePreview();
  }

  function showMarketDemoPricePreview(item, event) {
    const options = getMarketDemoInlineOptions();
    const base = getMarketPricingBaseGold(item, options);
    const price = calculateMarketListPrice(base, options);
    const preview = getMarketDemoPricePreviewElement();

    preview.innerHTML = `
      <strong>${formatMarketGold(price)} gold</strong><br>
      Base ${formatMarketGold(base)} (${getMarketPricingBasisLabel(options.pricingBasis)})<br>
      ${formatMarketMarkup(options.markup)} markup, ${getMarketDurationLabel(options.duration)}
    `;
    positionMarketDemoPricePreview(preview, event);
  }

  function getMarketDemoPricePreviewElement() {
    let preview = document.getElementById(MARKET_DEMO_PRICE_PREVIEW_ID);

    if (!preview) {
      preview = document.createElement("div");
      preview.id = MARKET_DEMO_PRICE_PREVIEW_ID;
      document.documentElement.appendChild(preview);
    }

    return preview;
  }

  function positionMarketDemoPricePreview(preview, event) {
    const offset = 16;
    const rect = preview.getBoundingClientRect();
    const left = Math.min(window.innerWidth - rect.width - 8, event.clientX + offset);
    const preferredTop = event.clientY - rect.height - offset;
    const fallbackTop = event.clientY + offset;
    const top = preferredTop >= 8
      ? preferredTop
      : Math.min(window.innerHeight - rect.height - 8, fallbackTop);

    preview.style.left = `${Math.max(8, left)}px`;
    preview.style.top = `${Math.max(8, top)}px`;
  }

  function hideMarketDemoPricePreview() {
    document.getElementById(MARKET_DEMO_PRICE_PREVIEW_ID)?.remove();
  }

  function handleMarketDemoInventoryClick(event) {
    if (!marketDemoMarkMode) {
      return;
    }

    const element = event.target?.closest?.("#inv [data-tooltip][data-position-x][data-position-y]");

    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const item = enrichMarketHealingItem(parseInventoryItemElement(element));

    if (!item?.isHealing || !Number(item.estimatedSellValue)) {
      updateMarketDemoStatus("Only visible healing items with a value can be marked.");
      return;
    }

    toggleSelectedMarketDemoItem(item.itemId);
  }

  function toggleSelectedMarketDemoItem(itemId) {
    const state = getMarketDemoSelectionState();
    const id = String(itemId || "");

    if (!id) {
      return;
    }

    if (state.itemIds.includes(id)) {
      state.itemIds = state.itemIds.filter(existing => existing !== id);
    } else {
      state.itemIds.push(id);
    }

    setMarketDemoSelectionState(state);
    refreshMarketDemoSelectionHighlights();
    updateMarketDemoStatus();
  }

  function getMarketDemoSelectionState() {
    return readMarketDemoJson(MARKET_DEMO_SELECTION_KEY, {
      itemIds: []
    });
  }

  function setMarketDemoSelectionState(state) {
    sessionStorage.setItem(MARKET_DEMO_SELECTION_KEY, JSON.stringify({
      itemIds: Array.from(new Set((state.itemIds || []).map(String)))
    }));
  }

  function refreshMarketDemoSelectionHighlights() {
    const selected = new Set(getMarketDemoSelectionState().itemIds || []);

    for (const item of getVisibleInventoryItems()) {
      item.element.classList.toggle("gladiatus-market-demo-selected", selected.has(String(item.itemId)));
    }
  }

  function getMarketDemoInlineOptions() {
    return {
      pricingBasis: document.getElementById("gladiatus-market-demo-pricing")?.value || "merchant",
      markup: Number(document.getElementById("gladiatus-market-demo-markup")?.value || MARKET_DEFAULT_MARKUP),
      duration: document.getElementById("gladiatus-market-demo-duration")?.value || MARKET_DEFAULT_DURATION
    };
  }

  function startSelectedMarketDemoSaleQueue() {
    const itemIds = getMarketDemoSelectionState().itemIds || [];

    if (!itemIds.length) {
      updateMarketDemoStatus("No marked items to sell.");
      return;
    }

    setMarketDemoSaleQueue({
      active: true,
      itemIds,
      options: getMarketDemoInlineOptions(),
      startedAt: Date.now()
    });
    updateMarketDemoStatus(`Sale queue started with ${itemIds.length} item(s).`);
    continueMarketDemoSaleQueue();
  }

  async function continueMarketDemoSaleQueue() {
    if (marketDemoQueueRunning || !isMarketPage()) {
      return;
    }

    const queue = getMarketDemoSaleQueue();

    if (!queue.active) {
      return;
    }

    marketDemoQueueRunning = true;

    try {
      await continueMarketDemoSaleQueueOnce(queue);
    } finally {
      marketDemoQueueRunning = false;
    }
  }

  async function continueMarketDemoSaleQueueOnce(queue) {
    const itemIds = Array.from(new Set((queue.itemIds || []).map(String))).filter(Boolean);

    if (!itemIds.length) {
      clearMarketDemoSaleQueue();
      setMarketDemoSelectionState({ itemIds: [] });
      refreshMarketDemoSelectionHighlights();
      updateMarketDemoStatus("Sale queue finished.");
      return;
    }

    if (getMarketSellForm()?.querySelector('input[name="sellid"]')?.value) {
      updateMarketDemoStatus("Sale slot already has an item. Queue paused.");
      return;
    }

    const itemId = itemIds[0];
    const item = resolveInventoryItem(itemId);

    if (!item) {
      queue.itemIds = itemIds.slice(1);
      setMarketDemoSaleQueue(queue);
      setMarketDemoSelectionState({ itemIds: queue.itemIds });
      refreshMarketDemoSelectionHighlights();
      setTimeout(continueMarketDemoSaleQueue, 250);
      return;
    }

    updateMarketDemoStatus(`Listing ${item.title || itemId}... ${itemIds.length} item(s) left.`);

    const prepared = await prepareMarketHealingOffer(itemId, queue.options || {});

    if (!prepared.ok) {
      queue.itemIds = itemIds.slice(1);
      setMarketDemoSaleQueue(queue);
      setMarketDemoSelectionState({ itemIds: queue.itemIds });
      refreshMarketDemoSelectionHighlights();
      updateMarketDemoStatus(`Skipped item: ${prepared.reason || "could not prepare offer"}`);
      setTimeout(continueMarketDemoSaleQueue, 700);
      return;
    }

    await sleep(350);
    queue.itemIds = itemIds.slice(1);
    setMarketDemoSaleQueue(queue);
    setMarketDemoSelectionState({ itemIds: queue.itemIds });
    refreshMarketDemoSelectionHighlights();

    const submitted = submitPreparedMarketOffer();

    if (!submitted.ok) {
      updateMarketDemoStatus(`Prepared but not submitted: ${submitted.reason || "submit failed"}`);
      return;
    }

    updateMarketDemoStatus(`Submitted ${prepared.item?.title || itemId}. Waiting for market page reload...`);
    setTimeout(continueMarketDemoSaleQueue, 5000);
  }

  function getMarketDemoSaleQueue() {
    return readMarketDemoJson(MARKET_DEMO_QUEUE_KEY, {
      active: false,
      itemIds: [],
      options: {},
      startedAt: 0
    });
  }

  function setMarketDemoSaleQueue(queue) {
    sessionStorage.setItem(MARKET_DEMO_QUEUE_KEY, JSON.stringify({
      active: Boolean(queue.active),
      itemIds: Array.from(new Set((queue.itemIds || []).map(String))),
      options: queue.options || {},
      startedAt: Number(queue.startedAt) || Date.now()
    }));
  }

  function clearMarketDemoSaleQueue() {
    sessionStorage.removeItem(MARKET_DEMO_QUEUE_KEY);
  }

  function clearMarketDemoSelectionAndQueue() {
    clearMarketDemoSaleQueue();
    setMarketDemoSelectionState({ itemIds: [] });
    refreshMarketDemoSelectionHighlights();
    updateMarketDemoStatus("Selection and queue cleared.");
  }

  function readMarketDemoJson(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      sessionStorage.removeItem(key);
      return fallback;
    }
  }

  function updateMarketDemoStatus(message = "") {
    const status = document.getElementById("gladiatus-market-demo-status");

    if (!status) {
      return;
    }

    const selectedCount = getMarketDemoSelectionState().itemIds?.length || 0;
    const queue = getMarketDemoSaleQueue();
    const queueCount = queue.active ? queue.itemIds?.length || 0 : 0;
    const parts = [];

    if (message) {
      parts.push(message);
    }

    parts.push(`${selectedCount} marked`);

    if (queue.active) {
      parts.push(`${queueCount} queued`);
    }

    status.textContent = parts.join(" | ");
  }

  function getVisibleMarketHealingItems(options = {}) {
    return getVisibleMarketHealingItemEntries(options)
      .map(item => ({
        ...summarizeMarketItem(item),
        pricingBasis: getMarketPricingBasis(options),
        pricingBaseGold: getMarketPricingBaseGold(item, options),
        recommendedPrice: calculateMarketListPrice(getMarketPricingBaseGold(item, options), options)
      }));
  }

  function getVisibleMarketHealingItemEntries() {
    return getVisibleInventoryItems()
      .map(item => enrichMarketHealingItem(item))
      .filter(item => item.isHealing && Number(item.estimatedSellValue) > 0);
  }

  function getVisibleInventoryItems() {
    const inventory = getInventoryBox();

    if (!inventory) {
      return [];
    }

    return Array.from(inventory.querySelectorAll("[data-tooltip][data-position-x][data-position-y]"))
      .map(parseInventoryItemElement)
      .filter(Boolean);
  }

  function parseInventoryItemElement(element) {
    if (!element) {
      return null;
    }

    const tooltipText = getInventoryItemTooltipText(element);

    return {
      element,
      itemId: getInventoryItemStableId(element),
      containerNumber: element.dataset.containerNumber || "",
      x: parseGladiatusInteger(element.dataset.positionX),
      y: parseGladiatusInteger(element.dataset.positionY),
      width: Number(element.dataset.measurementX) || 1,
      height: Number(element.dataset.measurementY) || 1,
      amount: Number(element.dataset.amount) || 1,
      contentType: element.dataset.contentType || "",
      basis: element.dataset.basis || "",
      title: getInventoryItemTitle(element),
      healing: parseHealingAmount(tooltipText),
      level: Number(element.dataset.level) || parseTooltipLevel(tooltipText),
      hash: element.dataset.hash || ""
    };
  }

  function getInventoryItemStableId(element) {
    return element.dataset.itemId
      || element.dataset.hash
      || `${element.dataset.containerNumber || ""}:${element.dataset.positionX || ""}:${element.dataset.positionY || ""}`;
  }

  function getInventoryItemTitle(element) {
    const tooltip = parseTooltipRows(element.dataset.tooltip);
    const first = tooltip.find(row => typeof row?.[0] === "string");

    return first?.[0] || element.getAttribute("title") || "";
  }

  function getInventoryItemTooltipText(element) {
    const rows = parseTooltipRows(element?.dataset?.tooltip);

    if (!rows.length) {
      return element?.dataset?.tooltip || "";
    }

    return rows
      .map(row => row?.[0])
      .filter(Boolean)
      .join("\n");
  }

  function parseTooltipRows(rawTooltip) {
    if (!rawTooltip) {
      return [];
    }

    try {
      const data = JSON.parse(decodeHtmlEntities(rawTooltip));
      const rows = [];

      function walk(value) {
        if (!Array.isArray(value)) {
          return;
        }

        if (typeof value[0] === "string") {
          rows.push(value);
        }

        value.forEach(walk);
      }

      walk(data);
      return rows;
    } catch {
      return [];
    }
  }

  function decodeHtmlEntities(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(value || "");
    return textarea.value;
  }

  function parseHealingAmount(text) {
    const match = String(text || "").match(/Using:\s*Heals\s+([\d.,]+)\s+of\s+life/i);
    return match ? parseGladiatusInteger(match[1]) : null;
  }

  function parseTooltipLevel(text) {
    const match = String(text || "").match(/\bLevel\s+([\d.,]+)/i);
    return match ? parseGladiatusInteger(match[1]) : null;
  }

  function enrichMarketHealingItem(item) {
    const tooltipText = getInventoryItemTooltipText(item.element);
    const valueGold = parseMarketInventoryValue(tooltipText);
    const merchantPrice = parseMarketMerchantPrice(tooltipText);
    const basis = String(item.basis || "").toLowerCase();
    const estimatedSellValue = valueGold
      || (merchantPrice ? Math.round(merchantPrice * MARKET_SELL_BACK_RATIO) : null);
    const estimatedMerchantPrice = merchantPrice
      || (valueGold ? Math.round(valueGold / MARKET_SELL_BACK_RATIO) : null);
    const estimatedMerchantPriceSource = merchantPrice
      ? "tooltip merchant price"
      : (valueGold ? "estimated from tooltip value" : "");

    return {
      ...item,
      isHealing: Number.isFinite(item.healing) && item.healing > 0,
      supported: MARKET_HEALING_ITEM_BASIS.has(basis),
      valueGold,
      merchantPrice,
      estimatedSellValue,
      estimatedMerchantPrice,
      estimatedMerchantPriceSource,
      goldPerHp: estimatedSellValue && item.healing
        ? estimatedSellValue / item.healing
        : null
    };
  }

  function parseMarketInventoryValue(text) {
    return parseMarketGoldText(text, /\bValue\s+([\d.,]+)/i);
  }

  function parseMarketMerchantPrice(text) {
    return parseMarketGoldText(text, /\bMerchant Price\s+([\d.,]+)/i);
  }

  function parseMarketGoldText(text, pattern) {
    const match = String(text || "").match(pattern);
    return match ? parseGladiatusInteger(match[1]) : null;
  }

  function calculateMarketListPrice(baseGold, options = {}) {
    const value = Math.max(0, Number(baseGold) || 0);
    const duration = String(options.duration || MARKET_DEFAULT_DURATION);
    const markup = Number.isFinite(Number(options.markup))
      ? Number(options.markup)
      : MARKET_DEFAULT_MARKUP;
    const feeRate = MARKET_DURATION_FEE_RATE[duration] ?? MARKET_DURATION_FEE_RATE[MARKET_DEFAULT_DURATION];

    if (!value) {
      return 0;
    }

    return Math.ceil(value * (1 + markup) / Math.max(0.01, 1 - feeRate));
  }

  function getMarketPricingBasis(options = {}) {
    return options.pricingBasis || "merchant";
  }

  function getMarketPricingBaseGold(item, options = {}) {
    if (getMarketPricingBasis(options) === "health") {
      return Math.max(999, Number(item.healing) || 0);
    }

    return item.estimatedMerchantPrice || item.estimatedSellValue;
  }

  function getMarketPricingBasisLabel(pricingBasis) {
    return pricingBasis === "health" ? "HP" : "vendor";
  }

  function getMarketDurationLabel(duration) {
    return ({
      "1": "2 h",
      "2": "8 h",
      "3": "24 h"
    })[String(duration)] || "24 h";
  }

  function formatMarketMarkup(markup) {
    return `${Math.round((Number(markup) || 0) * 100)}%`;
  }

  function formatMarketGold(value) {
    const number = Math.max(0, Math.round(Number(value) || 0));

    return number.toLocaleString();
  }

  async function prepareFirstMarketHealingOffer(options = {}) {
    if (!isMarketPage()) {
      const marketUrl = getMarketLink();

      if (marketUrl) {
        window.location.href = marketUrl;
        return {
          ok: true,
          navigating: true,
          reason: "opening market page"
        };
      }

      return {
        ok: false,
        reason: "market page unavailable"
      };
    }

    const items = getVisibleMarketHealingItemEntries()
      .sort(compareMarketHealingItemsForSale);

    if (!items.length) {
      return {
        ok: false,
        reason: "no visible healing item with value"
      };
    }

    return prepareMarketHealingOffer(items[0].itemId, options);
  }

  function compareMarketHealingItemsForSale(left, right) {
    return (Number(right.goldPerHp) || 0) - (Number(left.goldPerHp) || 0)
      || (Number(left.healing) || 0) - (Number(right.healing) || 0)
      || String(left.title).localeCompare(String(right.title));
  }

  async function prepareMarketHealingOffer(itemOrId, options = {}) {
    const rawItem = resolveInventoryItem(itemOrId?.itemId || itemOrId);
    const item = rawItem ? enrichMarketHealingItem(rawItem) : null;

    if (!item?.isHealing || Number(item.estimatedSellValue) <= 0) {
      return {
        ok: false,
        reason: "healing item with value not found"
      };
    }

    const duration = String(options.duration || MARKET_DEFAULT_DURATION);
    const pricingBaseGold = getMarketPricingBaseGold(item, options);
    const price = Number(options.price)
      || calculateMarketListPrice(pricingBaseGold, {
        duration,
        markup: options.markup
      });
    const moved = await moveMarketItemToSellSlot(item);

    if (!moved.ok) {
      return {
        ...moved,
        item: summarizeMarketItem(item)
      };
    }

    fillMarketSellForm({
      price,
      duration
    });

    const feeRate = MARKET_DURATION_FEE_RATE[duration] ?? MARKET_DURATION_FEE_RATE[MARKET_DEFAULT_DURATION];
    const expectedFee = Math.ceil(price * feeRate);
    const result = {
      ok: true,
      item: summarizeMarketItem(item),
      price,
      pricingBasis: getMarketPricingBasis(options),
      pricingBaseGold,
      duration,
      feeRate,
      expectedFee,
      expectedNet: price - expectedFee,
      expectedProfit: price - expectedFee - pricingBaseGold,
      submitted: false
    };

    console.log("[Market Demo] Prepared healing item market offer", result);
    return result;
  }

  function resolveInventoryItem(itemOrId) {
    if (itemOrId?.nodeType === Node.ELEMENT_NODE) {
      return parseInventoryItemElement(itemOrId);
    }

    if (itemOrId?.element) {
      return itemOrId;
    }

    const itemId = String(itemOrId || "");

    if (!itemId) {
      return null;
    }

    const escaped = typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(itemId)
      : itemId.replace(/"/g, '\\"');
    const element = document.querySelector(`[data-item-id="${escaped}"]`);

    return parseInventoryItemElement(element);
  }

  async function moveMarketItemToSellSlot(item) {
    const target = getMarketSellDropTarget();

    if (!target) {
      return {
        ok: false,
        reason: "market sell slot not found"
      };
    }

    setMarketInventoryPinned(true);

    try {
      await ensureMoveEndpointsVisible(item.element, target);

      const from = getElementCenter(item.element);
      const to = getElementCenter(target);

      simulateInventoryDrag(item.element, from, to);
      await sleep(900);

      const sellId = getMarketSellForm()?.querySelector('input[name="sellid"]')?.value || "";
      const ok = Boolean(sellId) || Boolean(getMarketSellDropTarget()?.querySelector("[data-item-id], [data-tooltip]"));

      return {
        ok,
        reason: ok ? "item placed in market sell slot" : "market sell slot did not accept item",
        sellId
      };
    } finally {
      setMarketInventoryPinned(false);
    }
  }

  async function ensureMoveEndpointsVisible(sourceElement, targetElement) {
    sourceElement?.scrollIntoView?.({
      block: "center",
      inline: "nearest"
    });
    await sleep(120);

    if (document.documentElement.classList.contains(MARKET_INVENTORY_PINNED_CLASS)) {
      await sleep(80);
      return;
    }

    targetElement?.scrollIntoView?.({
      block: "center",
      inline: "nearest"
    });
    await sleep(180);
  }

  function fillMarketSellForm({ price, duration = MARKET_DEFAULT_DURATION }) {
    const priceInput = getMarketPriceInput();
    const durationSelect = getMarketDurationSelect();

    if (durationSelect) {
      durationSelect.value = String(duration);
      durationSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (priceInput) {
      priceInput.focus();
      priceInput.value = String(Math.max(1, Math.round(Number(price) || 0)));
      priceInput.dispatchEvent(new Event("input", { bubbles: true }));
      priceInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
      priceInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function submitPreparedMarketOffer() {
    const form = getMarketSellForm();
    const button = getMarketOfferButton();
    const price = Number(getMarketPriceInput()?.value || 0);

    if (!form || !button || !price) {
      return {
        ok: false,
        reason: "market offer form incomplete"
      };
    }

    console.log("[Market Demo] Submitting prepared market offer", {
      price,
      duration: getMarketDurationSelect()?.value || "",
      fees: getMarketFeeElement()?.textContent?.trim() || ""
    });

    if (typeof form.requestSubmit === "function") {
      form.requestSubmit(button);
    } else {
      button.click();
    }

    return {
      ok: true,
      submitted: true,
      price
    };
  }

  function getElementCenter(element) {
    const rect = element.getBoundingClientRect();

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function simulateInventoryDrag(element, from, to) {
    dispatchInventoryMouseEvent(element, "mouseover", from);
    dispatchInventoryMouseEvent(element, "mousemove", from);
    dispatchInventoryMouseEvent(element, "mousedown", from);
    moveMouseBetweenPoints(element, from, to);

    const target = document.elementFromPoint(to.x, to.y) || getInventoryBox() || element;
    dispatchInventoryMouseEvent(target, "mouseup", to);
    dispatchInventoryMouseEvent(target, "click", to);
  }

  function moveMouseBetweenPoints(element, from, to) {
    const steps = 12;

    for (let step = 1; step <= steps; step++) {
      const point = {
        x: from.x + (to.x - from.x) * (step / steps),
        y: from.y + (to.y - from.y) * (step / steps)
      };

      dispatchInventoryMouseEvent(document.elementFromPoint(point.x, point.y) || element, "mousemove", point);
    }
  }

  function dispatchInventoryMouseEvent(target, type, point) {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: point.x,
      clientY: point.y,
      screenX: window.screenX + point.x,
      screenY: window.screenY + point.y,
      button: 0,
      buttons: type === "mouseup" || type === "click" ? 0 : 1
    }));
  }

  function summarizeMarketItem(item = {}) {
    return {
      itemId: item.itemId,
      title: item.title,
      basis: item.basis,
      supported: item.supported,
      level: item.level,
      healing: item.healing,
      valueGold: item.valueGold,
      merchantPrice: item.merchantPrice,
      estimatedSellValue: item.estimatedSellValue,
      estimatedMerchantPrice: item.estimatedMerchantPrice,
      estimatedMerchantPriceSource: item.estimatedMerchantPriceSource,
      goldPerHp: item.goldPerHp === null ? null : Math.round(item.goldPerHp * 1000) / 1000,
      x: item.x,
      y: item.y,
      bag: item.containerNumber
    };
  }

  function parseGladiatusInteger(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? Math.trunc(value) : null;
    }

    const normalized = String(value || "").replace(/[^\d]/g, "");
    const number = Number(normalized);

    return Number.isFinite(number) ? number : null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  window.gladiatusMarketDemo = {
    getVisibleMarketHealingItems,
    prepareFirstMarketHealingOffer,
    prepareMarketHealingOffer,
    submitPreparedMarketOffer,
    calculateMarketListPrice,
    startSelectedMarketDemoSaleQueue,
    clearMarketDemoSelectionAndQueue,
    continueMarketDemoSaleQueue
  };

  initializeMarketDemoPageControls();
  console.log("[Market Demo] Script loaded");
})();
