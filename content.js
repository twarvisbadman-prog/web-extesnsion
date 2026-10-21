// Reads Aviator history from the page. Adjust SELECTORS to match your site.

const SELECTORS = [
  '.history-list .bubble',
  '.history .bubble',
  '.payouts-block .bubble',
  '.coefficient-and-history .history',
  '[class*="history"] [class*="bubble"]',
  '[class*="history"] [class*="item"]',
  '[class*="payout"] span',
  '.stats-block .history-item'
];

function parseNum(text) {
  if (!text) return NaN;
  const m = String(text).replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : NaN;
}

function scrapeHistory() {
  for (const sel of SELECTORS) {
    const nodes = document.querySelectorAll(sel);
    if (!nodes.length) continue;
    const values = [];
    nodes.forEach(n => {
      const v = parseNum(n.textContent);
      if (!isNaN(v) && v >= 1 && v <= 100000) values.push(v);
    });
    if (values.length >= 3) return values.slice(0, 40);
  }
  return [];
}

// Push history to storage on every change
let last = '';
setInterval(() => {
  const h = scrapeHistory();
  const sig = h.join(',');
  if (h.length && sig !== last) {
    last = sig;
    chrome.storage.local.set({ aviator_history: h, aviator_updated: Date.now() });
  }
}, 1500);

// Also answer direct requests from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_HISTORY') {
    sendResponse({ history: scrapeHistory() });
  }
  return true;
});
