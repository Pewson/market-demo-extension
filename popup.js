const statusElement = document.getElementById("status");
const markupInput = document.getElementById("markup");
const durationSelect = document.getElementById("duration");
const pricingBasisSelect = document.getElementById("pricingBasis");

document.getElementById("scan").addEventListener("click", () => {
  runMarketDemoCommand("getVisibleMarketHealingItems", [getOptions()]);
});

document.getElementById("prepare").addEventListener("click", () => {
  runMarketDemoCommand("prepareFirstMarketHealingOffer", [getOptions()]);
});

document.getElementById("submit").addEventListener("click", () => {
  runMarketDemoCommand("submitPreparedMarketOffer");
});

function getOptions() {
  return {
    duration: durationSelect.value,
    markup: Number(markupInput.value) || 0,
    pricingBasis: pricingBasisSelect.value
  };
}

async function runMarketDemoCommand(method, args = []) {
  setStatus("Working...");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id) {
      setStatus("No active tab found.");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      source: "gladiatus-market-demo-popup",
      method,
      args
    });

    if (!response?.ok) {
      setStatus(response?.error || "Command failed.");
      return;
    }

    setStatus(formatResult(method, response.result));
  } catch (error) {
    setStatus(error?.message || String(error));
  }
}

function formatResult(method, result) {
  if (method === "getVisibleMarketHealingItems") {
    if (!Array.isArray(result) || !result.length) {
      return "No visible healing items found in the current bag.";
    }

    return result
      .slice(0, 8)
      .map(item => {
        return `${item.title || "Item"}\nValue ${item.valueGold || "?"}, heals ${item.healing || "?"}, base ${item.pricingBaseGold || "?"}, price ${item.recommendedPrice || "?"}`;
      })
      .join("\n\n");
  }

  return JSON.stringify(result, null, 2);
}

function setStatus(text) {
  statusElement.textContent = text;
}
