import { jump } from "./jumpService.js";
import { start, stop, getStatus, resetCountdown } from "./scheduler.js";

/**
 * 이동을 실행하고, 자동 점프가 실행 중인 경우 카운트다운 타이머를 전체 주기로 리셋합니다.
 */
async function handleJump(targetTabId = null) {
  const success = await jump(targetTabId);
  if (success) {
    // 자동 점프가 켜져 있다면 다음 이동 타이머를 처음부터 다시 카운트하도록 리셋
    await resetCountdown();
  }
  return success;
}

// 메시지 수신 핸들러 (Popup 및 Options와 통신)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "jump") {
    handleJump().then((success) => sendResponse({ ok: success }));
    return true; // 비동기 응답 대기
  }

  if (msg.action === "start") {
    (async () => {
      const s = await chrome.storage.local.get();
      const interval = Number(s.interval) || 10;
      const started = await start(interval, jump);
      sendResponse({ ok: started });
    })();
    return true;
  }

  if (msg.action === "stop") {
    stop("user").then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.action === "getStatus") {
    getStatus().then((status) => sendResponse(status));
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

// 대상 탭 종료 감지
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await chrome.storage.session.get();
  if (data.tabId === tabId) {
    console.log(`[Background] 대상 탭(${tabId})이 닫혀 자동 점프를 중지합니다.`);
    await stop("tab_closed");
  }
});

// 워치독 알람 감지 (Service Worker 비정상 정지 방지 보조)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "URL_JUMPER_ALARM") {
    const data = await chrome.storage.session.get();
    if (!data.running || !data.tabId) {
      await stop("alarm_sync");
    }
  }
});

// 브라우저 시작 및 확장 프로그램 정지 시 정리
chrome.runtime.onStartup.addListener(async () => {
  await stop("startup");
});

chrome.runtime.onSuspend.addListener(async () => {
  await stop("suspend");
});
