// Listen for a message from the popup to get history
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_HISTORY') {
    // Grab all text on the page
    const text = document.body.innerText;
    
    // Use a Regex to find things that look exactly like "1.52x" or "18.34x"
    // This grabs them regardless of what class names SportyBet uses
    const matches = text.match(/\b\d{1,3}(?:\.\d{1,2})?x\b/gi);
    
    let history = [];
    if (matches) {
      history = matches
        .map(m => parseFloat(m.replace('x', '').replace('X', '')))
        .filter(v => !isNaN(v) && v >= 1.0) // Aviator cannot crash below 1.00x
        .slice(0, 40); // Keep only the most recent 40
    }
    
    sendResponse({ history: history });
  }
  return true;
});
