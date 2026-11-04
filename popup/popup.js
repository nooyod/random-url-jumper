import { loadProfiles, applyProfile } from "./profileSelector.js";

const profileSelect = document.getElementById("profile");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const jumpBtn = document.getElementById("jump");
const settingsBtn = document.getElementById("settings");
const statusBadge = document.getElementById("statusBadge");

/**
 * 팝업 UI 상태를 갱신합니다.
 */
function updateUiStatus(isRunning, interval = 10) {
  if (isRunning) {
    statusBadge.textContent = `작동 중 (${interval}초)`;
    statusBadge.className = "badge running";
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusBadge.textContent = "정지됨";
    statusBadge.className = "badge idle";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// 1. 프로필 로드 및 현재 스케줄러 상태 동기화
await loadProfiles();

chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
  if (chrome.runtime.lastError || !response) {
    updateUiStatus(false);
    return;
  }
  updateUiStatus(response.running, response.interval);
});

// 2. 프로필 변경 이벤트
profileSelect.addEventListener("change", async () => {
  await applyProfile();
});

// 3. 시작 버튼
startBtn.addEventListener("click", async () => {
  const profile = await applyProfile();
  if (!profile) {
    alert("먼저 설정에서 프로필을 등록해주세요.");
    return;
  }

  chrome.runtime.sendMessage({ action: "start" }, (res) => {
    if (res?.ok) {
      updateUiStatus(true, profile.interval || 10);
    }
  });
});

// 4. 정지 버튼
stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stop" }, (res) => {
    if (res?.ok) {
      updateUiStatus(false);
    }
  });
});

// 5. 즉시 이동 버튼
jumpBtn.addEventListener("click", async () => {
  await applyProfile();
  chrome.runtime.sendMessage({ action: "jump" });
});

// 6. 설정 버튼
settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
