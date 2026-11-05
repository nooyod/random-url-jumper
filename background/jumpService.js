import { generateRandom } from "../core/randomGenerator.js";
import { buildUrl } from "../core/urlBuilder.js";

/**
 * 일반 브라우저 창('normal')의 활성 탭을 안전하게 찾습니다.
 */
async function findActiveNormalTab() {
  try {
    const normalWin = await chrome.windows.getLastFocused({
      windowTypes: ["normal"],
      populate: true
    });
    const activeTab = normalWin?.tabs?.find((t) => t.active);
    if (activeTab && activeTab.id) {
      return activeTab.id;
    }
  } catch {}

  try {
    const normalTabs = await chrome.tabs.query({
      active: true,
      windowType: "normal"
    });
    if (normalTabs.length > 0 && normalTabs[0].id) {
      return normalTabs[0].id;
    }
  } catch {}

  return null;
}

/**
 * 활성화된 설정 및 프로필을 기반으로 지정된 탭을 새 무작위 URL로 이동시킵니다.
 * @param {number} [targetTabId] 대상 탭 ID
 * @param {string} [targetProfileName] 적용할 프로필 이름
 */
export async function jump(targetTabId = null, targetProfileName = null) {
  const settings = await chrome.storage.local.get();
  const profiles = settings.profiles || [];

  if (profiles.length === 0) {
    console.warn("[JumpService] 등록된 프로필이 없습니다. 옵션에서 프로필을 먼저 저장해주세요.");
    return false;
  }

  // 1. 프로필 찾기
  let profile = null;
  if (targetProfileName) {
    profile = profiles.find((p) => p.name === targetProfileName);
  }

  if (!profile) {
    profile =
      profiles.find((p) => p.name === settings.activeProfileName) ||
      profiles.find((p) => p.baseUrl === settings.baseUrl) ||
      profiles[0];
  }

  if (!profile) {
    console.warn("[JumpService] 유효한 프로필이 없습니다.");
    return false;
  }

  let value = "";
  let isFullUrl = false;

  // 목록 크롤링 기반 ID/URL 선택
  if (profile.generator === "crawl" && profile.cachedIds?.length > 0) {
    const randomIndex = Math.floor(Math.random() * profile.cachedIds.length);
    value = String(profile.cachedIds[randomIndex]);
    if (value.startsWith("http://") || value.startsWith("https://")) {
      isFullUrl = true;
    }
  } else {
    // 무작위 생성 (number, text, mix)
    value = generateRandom(profile.mode || "number", profile.length || 4);
  }

  // 2. 이동할 URL 결정 (완전한 URL인 경우 그대로 사용)
  const url = isFullUrl
    ? value
    : buildUrl(profile.baseUrl || "", value, profile.suffix || "");

  if (!url) {
    console.warn("[JumpService] 생성된 URL이 올바르지 않습니다.");
    return false;
  }

  try {
    let tabId = targetTabId;

    if (!tabId) {
      tabId = await findActiveNormalTab();
      if (!tabId) {
        console.warn("[JumpService] 이동할 일반 브라우저 탭을 찾지 못했습니다.");
        return false;
      }
    }

    await chrome.tabs.update(tabId, { url });
    console.log(`[JumpService] 탭 ${tabId} 이동 성공 [프로필: ${profile.name}] -> ${url}`);
    return true;
  } catch (err) {
    console.error(`[JumpService] 탭 ${targetTabId} 이동 실패:`, err);
    return false;
  }
}
