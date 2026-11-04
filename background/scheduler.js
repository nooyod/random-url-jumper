const ALARM_NAME = "URL_JUMPER_ALARM";

let currentTimer = null;
let activeTabId = null;
let jumpCallback = null;

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

    if (!activeTabId || !jumpCallback) {
      await stop("state_invalid");
      return;
    }

    try {
      // 탭이 여전히 존재하는지 확인
      await chrome.tabs.get(activeTabId);
      await jumpCallback(activeTabId);

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
 * @param {Function} callback 점프 실행 콜백 함수
 */
export async function start(seconds, callback) {
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
  jumpCallback = callback;
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
 * 스케줄러를 중지합니다.
 * @param {string} reason 중지 사유
 */
export async function stop(reason = "manual") {
  if (currentTimer !== null) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }

  activeTabId = null;
  jumpCallback = null;

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
  const isRunning = Boolean(sessionData.running && currentTimer !== null);

  return {
    running: isRunning,
    tabId: sessionData.tabId || activeTabId,
    interval: sessionData.interval || 10,
    nextJumpTime: isRunning ? sessionData.nextJumpTime || null : null
  };
}
