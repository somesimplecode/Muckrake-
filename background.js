console.log('Muckrake background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'processClaim') {
    console.log('Background: Processing claim (placeholder):', request.text);
    sendResponse({ status: 'processing' });
  }

  return true;
});
