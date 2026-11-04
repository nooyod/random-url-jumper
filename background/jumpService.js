import { generateRandom } from "../core/randomGenerator.js";
import { buildUrl } from "../core/urlBuilder.js";

/**
 * 일반 브라우저 창('normal')의 활성 탭을 안전하게 찾습니다.
 * (팝아웃 창 등 확장 프로그램 팝업 윈도우 제외)
 */
async function findActiveNormalTab() {
  try {
    // 1. 마지막으로 포커스된 일반 창의 활성 탭
    const normalWin = await chrome.windows.getLastFocused({
      windowTypes: ["normal"],
      populate: true
    });
    const activeTab = normalWin?.tabs?.find((t) => t.active);
    if (activeTab && activeTab.id) {
      return activeTab.id;
    }
  } catch {}

  // 2. 전체 창 중 일반 창의 활성 탭 쿼리
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
 * 활성화된 설정 및 프로필을 기반으로 지정된 탭(또는 현재 활성 탭)을 새 URL로 이동시킵니다.
 * @param {number} [targetTabId] 대상 탭 ID (생략 시 일반 브라우저 활성 탭 검색)
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

    // targetTabId가 전달되지 않았을 경우, 세션 저장 탭 또는 일반 브라우저 창의 활성 탭 조회
    if (!tabId) {
      const session = await chrome.storage.session.get("tabId");
      if (session.tabId) {
        try {
          const savedTab = await chrome.tabs.get(session.tabId);
          if (savedTab) tabId = savedTab.id;
        } catch {}
      }

      if (!tabId) {
        tabId = await findActiveNormalTab();
      }

      if (!tabId) {
        console.warn("[JumpService] 이동할 일반 브라우저 탭을 찾지 못했습니다.");
        return false;
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
