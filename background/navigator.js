/**
 * 네비게이터 유틸리티
 */
export async function navigateActiveTab(url) {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { url });
    return true;
  }
  return false;
}
