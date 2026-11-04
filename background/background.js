import { jump } from "./jumpService.js";
import {
  startForTab,
  stopForTab,
  stopAll,
  getStatusForTab,
  resetCountdownForTab
} from "./scheduler.js";

/**
 * 일반 브라우저 창('normal')의 활성 탭 ID를 조회합니다.
 */
async function getActiveNormalTabId() {
  try {
    const normalWin = await chrome.windows.getLastFocused({
      windowTypes: ["normal"],
      populate: true
    });
    const activeTab = normalWin?.tabs?.find((t) => t.active);
    if (activeTab?.id) return activeTab.id;
  } catch {}

  try {
    const normalTabs = await chrome.tabs.query({ active: true, windowType: "normal" });
    if (normalTabs.length > 0 && normalTabs[0].id) return normalTabs[0].id;
  } catch {}

  return null;
}

/**
 * 특정 탭에서 즉시 이동을 수행하고, 해당 탭이 자동 실행 중이라면 카운트다운을 리셋합니다.
 */
async function handleJump(targetTabId = null, profileName = null) {
  let tabId = targetTabId;
  if (!tabId) {
    tabId = await getActiveNormalTabId();
  }

  const success = await jump(tabId, profileName);
  if (success && tabId) {
    await resetCountdownForTab(tabId);
  }
  return success;
}

// 메시지 수신 핸들러 (Popup 및 Options와 통신)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 1. 단일 점프
  if (msg.action === "jump") {
    handleJump(msg.tabId, msg.profileName).then((success) => sendResponse({ ok: success }));
    return true;
  }

  // 2. 특정 탭에서 스케줄러 시작
  if (msg.action === "start") {
    (async () => {
      let tabId = msg.tabId;
      if (!tabId) {
        tabId = await getActiveNormalTabId();
      }

      const settings = await chrome.storage.local.get();
      const profileName = msg.profileName || settings.activeProfileName;
      const interval = Number(msg.interval) || Number(settings.interval) || 10;

      const started = await startForTab(tabId, profileName, interval);
      sendResponse({ ok: started, tabId });
    })();
    return true;
  }

  // 3. 특정 탭의 스케줄러 중지
  if (msg.action === "stop") {
    (async () => {
      let tabId = msg.tabId;
      if (!tabId) {
        tabId = await getActiveNormalTabId();
      }
      const stopped = await stopForTab(tabId, "user");
      sendResponse({ ok: stopped, tabId });
    })();
    return true;
  }

  // 4. 모든 탭 일괄 중지
  if (msg.action === "stopAll") {
    stopAll("user_all").then(() => sendResponse({ ok: true }));
    return true;
  }

  // 5. 특정 탭의 상태 조회
  if (msg.action === "getStatus") {
    (async () => {
      let tabId = msg.tabId;
      if (!tabId) {
        tabId = await getActiveNormalTabId();
      }
      const status = await getStatusForTab(tabId);
      sendResponse(status);
    })();
    return true;
  }
});

// 단축키 핸들러 (Ctrl+Shift+Y)
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "jump_now") {
    console.log("[Background] 단축키 'jump_now' 감지, 탭 ID:", tab?.id);
    await handleJump(tab?.id);
  }
});

// 대상 탭 종료 감지 (닫힌 탭만 독립적으로 스케줄러 정리)
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await stopForTab(tabId, "tab_closed");
});

// 브라우저 시작 및 확장 프로그램 정지 시 정리
chrome.runtime.onStartup.addListener(async () => {
  await stopAll("startup");
});

chrome.runtime.onSuspend.addListener(async () => {
  await stopAll("suspend");
});
