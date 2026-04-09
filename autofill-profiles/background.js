// background.js - Opens extension options page on request from content script.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'OPEN_OPTIONS_PAGE') {
    chrome.runtime.openOptionsPage().then(
      () => sendResponse({ ok: true }),
      (error) => sendResponse({ ok: false, error: String(error) })
    );
    return true;
  }
  return false;
});
