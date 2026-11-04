import { jump } from "./jumpService.js";

const ALARM_NAME = "URL_JUMPER_ALARM";

let currentTimer = null;
let activeTabId = null;
let jumpCallback = jump;

/**
 * 다음 점프를 예약합니다 (초 단위 타이머).
 */
async function scheduleNext(seconds) {
  if (currentTimer !== null) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }

  const intervalSeconds = Math.max(1, Number(seconds) || 10);
  const nextJumpTime = Date.now() + intervalSeconds * 1000;

  // 세션 스토리지에 다음 점프 목표 시각 기록 (팝업 카운트다운용)
  await chrome.storage.session.set({
    running: true,
    tabId: activeTabId,
    interval: intervalSeconds,
    nextJumpTime
  });

  currentTimer = setTimeout(async () => {
    currentTimer = null;

    if (!activeTabId) {
      await stop("state_invalid");
      return;
    }

    const callback = jumpCallback || jump;

    try {
      // 탭이 여전히 존재하는지 확인
      await chrome.tabs.get(activeTabId);
      await callback(activeTabId);

      // 다음 점프 예약
      await scheduleNext(intervalSeconds);
    } catch (err) {
      console.warn("[Scheduler] 탭 확인 실패, 스케줄러 중단:", err);
      await stop("tab_closed");
    }
  }, intervalSeconds * 1000);
}

/**
 * 자동 점프 스케줄러를 시작합니다.
 * @param {number} seconds 주기(초)
 * @param {Function} [callback] 점프 실행 콜백 함수
 */
export async function start(seconds, callback = jump) {
  await stop("restart");

  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  const targetTab = tabs[0] || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

  if (!targetTab || !targetTab.id) {
    console.warn("[Scheduler] 활성 탭을 찾을 수 없습니다.");
    return false;
  }

  activeTabId = targetTab.id;
  jumpCallback = callback || jump;
  const intervalSeconds = Math.max(1, Number(seconds) || 10);

  // 백업 알람 등록 (워치독)
  try {
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: Math.max(1, Math.ceil(intervalSeconds / 60))
    });
  } catch (e) {
    console.warn("[Scheduler] Alarm 생성 에러:", e);
  }

  // 첫 번째 타이머 등록
  await scheduleNext(intervalSeconds);
  return true;
}

/**
 * 즉시 이동 발생 시, 스케줄러가 작동 중이라면 기존 타이머를 취소하고
 * 현재 시점부터 전체 주기를 새로 카운트다운하도록 리셋합니다.
 */
export async function resetCountdown() {
  const sessionData = await chrome.storage.session.get();
  if (!sessionData.running) {
    return false;
  }

  if (!activeTabId && sessionData.tabId) {
    activeTabId = sessionData.tabId;
  }

  const intervalSeconds = Math.max(1, Number(sessionData.interval) || 10);
  console.log(`[Scheduler] 즉시 이동 감지 -> ${intervalSeconds}초 카운트다운 타이머 리셋`);
  await scheduleNext(intervalSeconds);
  return true;
}

/**
 * 스케줄러를 중지합니다.
 * @param {string} reason 중지 사유
 */
export async function stop(reason = "manual") {
  if (currentTimer !== null) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }

  activeTabId = null;
  jumpCallback = jump;

  try {
    await chrome.alarms.clear(ALARM_NAME);
  } catch {}

  await chrome.storage.session.clear();
  console.log(`[Scheduler] 중지됨 (사유: ${reason})`);
}

/**
 * 현재 스케줄러 상태를 반환합니다.
 */
export async function getStatus() {
  const sessionData = await chrome.storage.session.get();
  const isRunning = Boolean(sessionData.running && (currentTimer !== null || sessionData.nextJumpTime));

  return {
    running: isRunning,
    tabId: sessionData.tabId || activeTabId,
    interval: sessionData.interval || 10,
    nextJumpTime: isRunning ? sessionData.nextJumpTime || null : null
  };
}
