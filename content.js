// content.js

function extractMultipliers() {
  const values = [];
  const seen = new Set();

  // Walk every element that has no children (leaf nodes with text only)
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || '').trim();
    // Match "1.52x", "18.34x", "2.00x"
    if (/^\d{1,4}(\.\d{1,3})?x$/i.test(text)) {
      const v = parseFloat(text.replace(/x/i, ''));
      if (!isNaN(v) && v >= 1 && v <= 100000) {
        // Deduplicate by parent element so we don't read the same bubble twice
        const parent = node.parentElement;
        if (parent && !seen.has(parent)) {
          seen.add(parent);
          values.push(v);
        }
      }
    }
  }

  // Newest first; keep 40
  return values.slice(0, 40);
}

// Respond to popup requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_HISTORY') {
    sendResponse({ history: extractMultipliers() });
  }
  return true;
});

// Also keep a copy in storage so the popup can show data instantly
setInterval(() => {
  const h = extractMultipliers();
  if (h.length) {
    chrome.storage.local.set({ aviator_history: h, aviator_updated: Date.now() });
  }
}, 2000);
