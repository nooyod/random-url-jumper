/**
 * Chrome Storage 헬퍼 모듈
 */
export async function getLocalStorage(keys = null) {
  return await chrome.storage.local.get(keys);
}

export async function setLocalStorage(items) {
  await chrome.storage.local.set(items);
}

export async function getSessionStorage(keys = null) {
  return await chrome.storage.session.get(keys);
}

export async function setSessionStorage(items) {
  await chrome.storage.session.set(items);
}

export async function clearSessionStorage() {
  await chrome.storage.session.clear();
}
