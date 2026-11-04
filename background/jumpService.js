import { generateRandom } from "../core/randomGenerator.js";
import { buildUrl } from "../core/urlBuilder.js";

/**
 * 활성화된 설정 및 프로필을 기반으로 지정된 탭(또는 현재 활성 탭)을 새 URL로 이동시킵니다.
 * @param {number} [targetTabId] 대상 탭 ID (생략 시 현재 활성 탭 검색)
 */
export async function jump(targetTabId = null) {
  const settings = await chrome.storage.local.get();
  const profiles = settings.profiles || [];

  if (profiles.length === 0) {
    console.warn("[JumpService] 등록된 프로필이 없습니다. 옵션에서 프로필을 먼저 저장해주세요.");
    return false;
  }

  // 1. activeProfileName 우선 조회 -> 없으면 baseUrl 일치 항목 -> 첫 번째 프로필
  const profile =
    profiles.find((p) => p.name === settings.activeProfileName) ||
    profiles.find((p) => p.baseUrl === settings.baseUrl) ||
    profiles[0];

  if (!profile || !profile.baseUrl) {
    console.warn("[JumpService] 유효한 프로필 주소가 없습니다.");
    return false;
  }

  let value = "";

  // 목록 크롤링 기반 ID 선택
  if (profile.generator === "crawl" && profile.cachedIds?.length > 0) {
    const randomIndex = Math.floor(Math.random() * profile.cachedIds.length);
    value = String(profile.cachedIds[randomIndex]);
  } else {
    // 무작위 생성 (number, text, mix)
    value = generateRandom(profile.mode || "number", profile.length || 4);
  }

  const url = buildUrl(profile.baseUrl, value, profile.suffix || "");

  try {
    let tabId = targetTabId;

    // targetTabId가 전달되지 않았을 경우, Service Worker에서 가장 신뢰할 수 있는 lastFocusedWindow로 조회
    if (!tabId) {
      const activeTabs = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
      });

      if (activeTabs.length > 0 && activeTabs[0].id) {
        tabId = activeTabs[0].id;
      } else {
        // 보조 fallback
        const fallbackTabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        if (fallbackTabs.length === 0 || !fallbackTabs[0].id) {
          console.warn("[JumpService] 이동할 활성 탭을 찾지 못했습니다.");
          return false;
        }
        tabId = fallbackTabs[0].id;
      }
    }

    await chrome.tabs.update(tabId, { url });
    console.log(`[JumpService] 탭 ${tabId} 이동 성공 -> ${url}`);
    return true;
  } catch (err) {
    console.error("[JumpService] 이동 실패:", err);
    return false;
  }
}
