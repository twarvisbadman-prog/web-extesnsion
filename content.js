// A smarter scraper that looks for the 'x' format in the top bar
function scrapeHistory() {
  const values = [];
  // Find all spans or divs that contain a number followed by 'x'
  const elements = document.querySelectorAll('span, div, p');
  
  for (const el of elements) {
    // Only look at elements with no children (just text) to avoid grabbing large blocks
    if (el.children.length > 0) continue;
    
    const text = el.textContent.trim();
    // Matches formats like "1.52x", "18.34x", "2.00x"
    if (/^\d+(\.\d+)?x$/i.test(text)) {
      const v = parseFloat(text.replace('x', ''));
      if (!isNaN(v) && v >= 1) {
        values.push(v);
        // Stop once we have 40
        if (values.length >= 40) break;
      }
    }
  }
  return values;
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
}, 1000); // Check every 1 second

// Answer direct requests from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_HISTORY') {
    sendResponse({ history: scrapeHistory() });
  }
  return true;
});
