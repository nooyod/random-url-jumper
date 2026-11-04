import { loadProfiles, applyProfile } from "./profileSelector.js";

const profileSelect = document.getElementById("profile");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const jumpBtn = document.getElementById("jump");
const settingsBtn = document.getElementById("settings");
const statusBadge = document.getElementById("statusBadge");

// 카운트다운 관련 DOM 요소
const countdownCard = document.getElementById("countdownCard");
const countdownNumber = document.getElementById("countdownNumber");
const countdownProgressBar = document.getElementById("countdownProgressBar");

let countdownIntervalId = null;

/**
 * 실시간 카운트다운 타이머 시작
 */
function startCountdown(nextJumpTime, interval = 10) {
  if (countdownIntervalId !== null) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }

  countdownCard.style.display = "block";
  startBtn.disabled = true;
  stopBtn.disabled = false;
  statusBadge.className = "badge running";

  const totalDurationMs = Math.max(1, Number(interval) || 10) * 1000;

  const update = () => {
    const remainingMs = nextJumpTime - Date.now();
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

    if (remainingMs <= 0) {
      countdownNumber.textContent = "0";
      countdownProgressBar.style.width = "0%";
      statusBadge.textContent = "이동 중...";
    } else {
      countdownNumber.textContent = String(remainingSec);
      statusBadge.textContent = `${remainingSec}초 남음`;
      const progressPercent = Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100));
      countdownProgressBar.style.width = `${progressPercent}%`;
    }
  };

  update();
  countdownIntervalId = setInterval(update, 100);
}

/**
 * 카운트다운 타이머 정지 및 초기화
 */
function stopCountdown() {
  if (countdownIntervalId !== null) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }

  countdownCard.style.display = "none";
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusBadge.textContent = "정지됨";
  statusBadge.className = "badge idle";
}

/**
 * UI 상태 동기화
 */
function syncUiState(status) {
  if (!status || !status.running) {
    stopCountdown();
    return;
  }

  const nextJump = status.nextJumpTime || (Date.now() + (status.interval || 10) * 1000);
  startCountdown(nextJump, status.interval || 10);
}

// 1. 프로필 목록 로드
await loadProfiles();

// 2. 현재 스케줄러 상태 확인 및 초기화
chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
  if (chrome.runtime.lastError || !response) {
    stopCountdown();
    return;
  }
  syncUiState(response);
});

// 3. 백그라운드 세션 변경 실시간 감지 (다음 점프 시각 갱신 시 자동 리셋)
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.running?.newValue === false) {
    stopCountdown();
  } else if (changes.nextJumpTime?.newValue) {
    chrome.storage.session.get(null).then((data) => {
      if (data.running) {
        startCountdown(data.nextJumpTime, data.interval || 10);
      }
    });
  }
});

// 4. 프로필 변경 이벤트
profileSelect.addEventListener("change", async () => {
  await applyProfile();
});

// 5. 시작 버튼 클릭
startBtn.addEventListener("click", async () => {
  const profile = await applyProfile();
  if (!profile) {
    alert("먼저 설정에서 프로필을 등록해주세요.");
    return;
  }

  chrome.runtime.sendMessage({ action: "start" }, (res) => {
    if (res?.ok) {
      chrome.runtime.sendMessage({ action: "getStatus" }, (status) => {
        syncUiState(status);
      });
    }
  });
});

// 6. 정지 버튼 클릭
stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stop" }, (res) => {
    if (res?.ok) {
      stopCountdown();
    }
  });
});

// 7. 즉시 이동 버튼 클릭
jumpBtn.addEventListener("click", async () => {
  await applyProfile();
  chrome.runtime.sendMessage({ action: "jump" });
});

// 8. 설정 페이지 열기
settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
