// content.js

function scrapeHistory() {
  const values = [];
  // A list of potential selectors for the history bubbles
  const selectors = [
    '.history-list .bubble',      // Common
    '.payouts-block .bubble',     // Spribe style
    '.history .bubble',
    '[class*="history"] [class*="bubble"]',
    '[class*="history"] [class*="item"]',
    '[class*="payout"] span',
    '.coefficient-and-history .history',
    // A more aggressive approach: find any element that looks like a multiplier
    'div, span'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      // Ensure the element has no children and only contains text
      if (el.children.length > 0) continue;
      
      const text = el.textContent.trim();
      // Regex to match "1.52x", "2.00x", etc.
      if (/^\d+(\.\d+)?x$/i.test(text)) {
        const v = parseFloat(text.replace('x', ''));
        if (!isNaN(v) && v >= 1) {
          values.push(v);
        }
      }
    }
    // If we found data with a specific selector, stop and return it
    if (values.length > 0) {
      return values.slice(0, 40); // Keep the most recent 40
    }
  }
  
  return [];
}

// Listen for a message from the popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_HISTORY') {
    sendResponse({ history: scrapeHistory() });
  }
  return true;
});
