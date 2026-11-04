import { jump } from "./jumpService.js";
import { start, stop, getStatus } from "./scheduler.js";

// 메시지 수신 핸들러 (Popup 및 Options와 통신)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "jump") {
    jump().then((success) => sendResponse({ ok: success }));
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
// Chrome 109+에서는 두 번째 인자로 현재 활성 tab 객체가 직접 전달됩니다.
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "jump_now") {
    console.log("[Background] 단축키 'jump_now' 감지, 탭 ID:", tab?.id);
    await jump(tab?.id);
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
