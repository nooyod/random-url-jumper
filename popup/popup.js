import { loadProfiles, applyProfile } from "./profileSelector.js";

const profileSelect = document.getElementById("profile");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const jumpBtn = document.getElementById("jump");
const settingsBtn = document.getElementById("settings");
const statusBadge = document.getElementById("statusBadge");
const popoutBtn = document.getElementById("popoutBtn");

// 카운트다운 관련 DOM 요소
const countdownCard = document.getElementById("countdownCard");
const countdownNumber = document.getElementById("countdownNumber");
const countdownProgressBar = document.getElementById("countdownProgressBar");

let countdownIntervalId = null;
let isCheckingStatus = false;

// 📌 1. 팝아웃 모드 확인 및 UI 조정
const urlParams = new URLSearchParams(window.location.search);
const isPopout = urlParams.get("mode") === "popout";

if (isPopout) {
  document.body.classList.add("is-popout");
  document.title = "Random Jumper 리모컨";
  if (popoutBtn) {
    popoutBtn.style.display = "none"; // 이미 분리된 창에서는 팝아웃 버튼 숨김
  }
}

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

      // 0초 도달 시 백그라운드의 다음 주기(nextJumpTime) 갱신을 능동적으로 폴링
      if (!isCheckingStatus) {
        isCheckingStatus = true;
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
            isCheckingStatus = false;
            if (response && response.running) {
              syncUiState(response);
            }
          });
        }, 600);
      }
    } else {
      isCheckingStatus = false;
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

  isCheckingStatus = false;
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

// 2. 프로필 목록 로드
await loadProfiles();

// 3. 현재 스케줄러 상태 확인 및 초기화
chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
  if (chrome.runtime.lastError || !response) {
    stopCountdown();
    return;
  }
  syncUiState(response);
});

// 4. 백그라운드 세션 스토리지 변경 실시간 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session") {
    if (changes.running?.newValue === false) {
      stopCountdown();
    } else if (changes.nextJumpTime?.newValue) {
      const nextJumpTime = changes.nextJumpTime.newValue;
      chrome.storage.session.get(null).then((data) => {
        if (data.running) {
          startCountdown(nextJumpTime, data.interval || 10);
        }
      });
    }
  }
});

// 5. 프로필 변경 이벤트
profileSelect.addEventListener("change", async () => {
  await applyProfile();
});

// 6. 시작 버튼 클릭
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

// 7. 정지 버튼 클릭
stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stop" }, (res) => {
    if (res?.ok) {
      stopCountdown();
    }
  });
});

// 8. 즉시 이동 버튼 클릭 (카운트다운 즉시 리셋 동기화)
jumpBtn.addEventListener("click", async () => {
  await applyProfile();
  chrome.runtime.sendMessage({ action: "jump" }, (res) => {
    if (res?.ok) {
      chrome.runtime.sendMessage({ action: "getStatus" }, (status) => {
        syncUiState(status);
      });
    }
  });
});

// 9. 📌 팝아웃 버튼 클릭: 사라지지 않는 독립 미니 창으로 분리
if (popoutBtn) {
  popoutBtn.addEventListener("click", () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html?mode=popout"),
      type: "popup",
      width: 290,
      height: 430,
      focused: true
    });
    window.close(); // 기존의 닫히는 팝업창은 닫아줌
  });
}

// 10. 설정 페이지 열기
settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
