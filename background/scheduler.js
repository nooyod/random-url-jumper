import { jump } from "./jumpService.js";

const ALARM_NAME = "URL_JUMPER_ALARM";

// 탭별 독립 스케줄러 맵: Map<tabId, { timer, interval, profileName, nextJumpTime }>()
const activeSchedulers = new Map();

/**
 * 세션 스토리지에 전체 실행 중인 스케줄러 정보 동기화
 */
async function syncSessionStorage() {
  const schedulersData = {};
  for (const [tabId, data] of activeSchedulers.entries()) {
    schedulersData[tabId] = {
      running: true,
      interval: data.interval,
      profileName: data.profileName,
      nextJumpTime: data.nextJumpTime
    };
  }

  await chrome.storage.session.set({
    schedulers: schedulersData,
    activeCount: activeSchedulers.size
  });

  // 실행 중인 탭이 하나라도 있으면 워치독 알람 유지
  if (activeSchedulers.size > 0) {
    try {
      await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    } catch {}
  } else {
    try {
      await chrome.alarms.clear(ALARM_NAME);
    } catch {}
  }
}

/**
 * 특정 탭의 다음 점프를 예약합니다.
 */
async function scheduleNext(tabId, intervalSeconds, profileName) {
  const current = activeSchedulers.get(tabId);
  if (current?.timer !== null && current?.timer !== undefined) {
    clearTimeout(current.timer);
  }

  const seconds = Math.max(1, Number(intervalSeconds) || 10);
  const nextJumpTime = Date.now() + seconds * 1000;

  const timer = setTimeout(async () => {
    // 탭이 여전히 등록되어 있는지 확인
    if (!activeSchedulers.has(tabId)) {
      return;
    }

    try {
      // 탭 존재 여부 검사
      await chrome.tabs.get(tabId);
      await jump(tabId, profileName);

      // 다음 점프 예약
      await scheduleNext(tabId, seconds, profileName);
    } catch (err) {
      console.warn(`[Scheduler] 탭(${tabId}) 오류 또는 닫힘으로 중단:`, err);
      await stopForTab(tabId, "tab_closed");
    }
  }, seconds * 1000);

  activeSchedulers.set(tabId, {
    timer,
    interval: seconds,
    profileName,
    nextJumpTime
  });

  await syncSessionStorage();
}

/**
 * 특정 탭에서 자동 점프 스케줄러를 시작합니다.
 * @param {number} tabId 대상 탭 ID
 * @param {string} profileName 사용할 프로필 이름
 * @param {number} seconds 주기(초)
 */
export async function startForTab(tabId, profileName, seconds) {
  if (!tabId) {
    console.warn("[Scheduler] 유효한 tabId가 필요합니다.");
    return false;
  }

  const interval = Math.max(1, Number(seconds) || 10);
  await scheduleNext(tabId, interval, profileName);
  console.log(`[Scheduler] 탭(${tabId}) 스케줄러 시작 [프로필: ${profileName}, 주기: ${interval}초]`);
  return true;
}

/**
 * 특정 탭의 스케줄러를 중지합니다.
 * @param {number} tabId 대상 탭 ID
 * @param {string} reason 중지 사유
 */
export async function stopForTab(tabId, reason = "manual") {
  const current = activeSchedulers.get(tabId);
  if (current) {
    if (current.timer !== null) {
      clearTimeout(current.timer);
    }
    activeSchedulers.delete(tabId);
    await syncSessionStorage();
    console.log(`[Scheduler] 탭(${tabId}) 스케줄러 중지 (사유: ${reason})`);
    return true;
  }
  return false;
}

/**
 * 모든 탭의 스케줄러를 일괄 중지합니다.
 */
export async function stopAll(reason = "manual_all") {
  for (const [tabId, data] of activeSchedulers.entries()) {
    if (data.timer !== null) {
      clearTimeout(data.timer);
    }
  }
  activeSchedulers.clear();
  await chrome.storage.session.clear();
  console.log(`[Scheduler] 모든 탭 스케줄러 중지 (사유: ${reason})`);
}

/**
 * 특정 탭에서 즉시 이동이 발생했을 때, 해당 탭의 카운트다운 타이머만 처음부터 다시 리셋합니다.
 * @param {number} tabId 대상 탭 ID
 */
export async function resetCountdownForTab(tabId) {
  const current = activeSchedulers.get(tabId);
  if (!current) {
    return false;
  }

  console.log(`[Scheduler] 탭(${tabId}) 즉시 이동 감지 -> ${current.interval}초 카운트다운 리셋`);
  await scheduleNext(tabId, current.interval, current.profileName);
  return true;
}

/**
 * 특정 탭의 현재 실행 상태를 반환합니다.
 * @param {number} tabId 대상 탭 ID
 */
export async function getStatusForTab(tabId) {
  const current = activeSchedulers.get(tabId);
  const sessionData = await chrome.storage.session.get("schedulers");
  const tabSession = sessionData?.schedulers?.[tabId];

  const isRunning = Boolean(current || tabSession?.running);
  const interval = current?.interval || tabSession?.interval || 10;
  const profileName = current?.profileName || tabSession?.profileName || "";
  const nextJumpTime = current?.nextJumpTime || tabSession?.nextJumpTime || null;

  return {
    running: isRunning,
    tabId,
    interval,
    profileName,
    nextJumpTime: isRunning ? nextJumpTime : null,
    totalActiveCount: activeSchedulers.size
  };
}

/**
 * 현재 실행 중인 모든 탭 목록 정보를 반환합니다.
 */
export function getActiveTabList() {
  return Array.from(activeSchedulers.keys());
}
