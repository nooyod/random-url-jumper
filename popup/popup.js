import { loadProfiles, applyProfile } from "./profileSelector.js";

const profileSelect = document.getElementById("profile");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const jumpBtn = document.getElementById("jump");
const settingsBtn = document.getElementById("settings");
const statusBadge = document.getElementById("statusBadge");
const popoutBtn = document.getElementById("popoutBtn");
const currentTabLabel = document.getElementById("currentTabLabel");
const multiTabStatus = document.getElementById("multiTabStatus");
const stopAllBtn = document.getElementById("stopAllBtn");

// 카운트다운 관련 DOM 요소
const countdownCard = document.getElementById("countdownCard");
const countdownNumber = document.getElementById("countdownNumber");
const countdownProgressBar = document.getElementById("countdownProgressBar");

let countdownIntervalId = null;
let currentTabId = null;
let isCheckingStatus = false;

// 📌 1. 팝아웃 모드 확인
const urlParams = new URLSearchParams(window.location.search);
const isPopout = urlParams.get("mode") === "popout";

if (isPopout) {
  document.body.classList.add("is-popout");
  document.title = "Random Jumper 리모컨";
  if (popoutBtn) {
    popoutBtn.style.display = "none";
  }
}

/**
 * 일반 브라우저 창('normal')의 현재 활성 탭을 조회합니다.
 */
async function getTargetTab() {
  try {
    const normalWin = await chrome.windows.getLastFocused({
      windowTypes: ["normal"],
      populate: true
    });
    const activeTab = normalWin?.tabs?.find((t) => t.active);
    if (activeTab && activeTab.id) {
      return activeTab;
    }
  } catch {}

  try {
    const normalTabs = await chrome.tabs.query({ active: true, windowType: "normal" });
    if (normalTabs.length > 0) {
      return normalTabs[0];
    }
  } catch {}

  return null;
}

/**
 * 실시간 카운트다운 시작
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

      if (!isCheckingStatus) {
        isCheckingStatus = true;
        setTimeout(() => {
          if (!currentTabId) return;
          chrome.runtime.sendMessage({ action: "getStatus", tabId: currentTabId }, (response) => {
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
 * 카운트다운 정지 및 초기화
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
  // 전체 활성 탭 개수 UI 갱신
  const totalCount = status?.totalActiveCount || 0;
  if (totalCount > 0) {
    multiTabStatus.textContent = `총 ${totalCount}개 탭 실행 중`;
    stopAllBtn.style.display = "inline";
  } else {
    multiTabStatus.textContent = "";
    stopAllBtn.style.display = "none";
  }

  // 현재 탭의 스케줄러 상태 갱신
  if (!status || !status.running) {
    stopCountdown();
    return;
  }

  // 이 탭에서 실행 중인 프로필이 있다면 셀렉트 박스 동기화
  if (status.profileName && profileSelect.value !== status.profileName) {
    profileSelect.value = status.profileName;
  }

  const nextJump = status.nextJumpTime || (Date.now() + (status.interval || 10) * 1000);
  startCountdown(nextJump, status.interval || 10);
}

/**
 * 현재 활성 탭을 감지하고 상태를 새로고침합니다.
 */
async function refreshCurrentTabState() {
  const targetTab = await getTargetTab();
  if (!targetTab) {
    currentTabLabel.textContent = "감지된 웹페이지 없음";
    currentTabId = null;
    stopCountdown();
    return;
  }

  currentTabId = targetTab.id;
  const title = targetTab.title || targetTab.url || `탭 #${currentTabId}`;
  currentTabLabel.textContent = title.length > 22 ? `${title.slice(0, 22)}...` : title;
  currentTabLabel.title = title;

  chrome.runtime.sendMessage({ action: "getStatus", tabId: currentTabId }, (response) => {
    if (chrome.runtime.lastError || !response) {
      stopCountdown();
      return;
    }
    syncUiState(response);
  });
}

// 2. 초기 프로필 목록 로드 및 현재 탭 상태 확인
await loadProfiles();
await refreshCurrentTabState();

// 3. 사용자가 다른 탭으로 전환했을 때 실시간 감지 (자동 전환!)
chrome.tabs.onActivated.addListener(async () => {
  await refreshCurrentTabState();
});

// 4. 세션 스토리지 변경 감지 (다중 탭 스케줄러 변경 실시간 반영)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session") {
    if (!currentTabId) return;
    chrome.runtime.sendMessage({ action: "getStatus", tabId: currentTabId }, (status) => {
      if (status) {
        syncUiState(status);
      }
    });
  }
});

// 5. 프로필 변경 이벤트
profileSelect.addEventListener("change", async () => {
  await applyProfile();
});

// 6. [이 탭 시작] 버튼 클릭
startBtn.addEventListener("click", async () => {
  if (!currentTabId) {
    alert("점프를 실행할 웹페이지 탭을 찾을 수 없습니다.");
    return;
  }

  const profile = await applyProfile();
  if (!profile) {
    alert("먼저 설정에서 프로필을 등록해주세요.");
    return;
  }

  chrome.runtime.sendMessage(
    {
      action: "start",
      tabId: currentTabId,
      profileName: profile.name,
      interval: profile.interval || 10
    },
    (res) => {
      if (res?.ok) {
        chrome.runtime.sendMessage({ action: "getStatus", tabId: currentTabId }, (status) => {
          syncUiState(status);
        });
      }
    }
  );
});

// 7. [이 탭 정지] 버튼 클릭
stopBtn.addEventListener("click", () => {
  if (!currentTabId) return;
  chrome.runtime.sendMessage({ action: "stop", tabId: currentTabId }, (res) => {
    if (res?.ok) {
      stopCountdown();
      // 전체 카운트 갱신을 위해 getStatus 재조회
      chrome.runtime.sendMessage({ action: "getStatus", tabId: currentTabId }, (status) => {
        syncUiState(status);
      });
    }
  });
});

// 8. [전체 정지] 버튼 클릭
stopAllBtn.addEventListener("click", () => {
  if (confirm("실행 중인 모든 탭의 자동 점프를 중지하시겠습니까?")) {
    chrome.runtime.sendMessage({ action: "stopAll" }, () => {
      stopCountdown();
      multiTabStatus.textContent = "";
      stopAllBtn.style.display = "none";
    });
  }
});

// 9. [이 탭 즉시 이동] 버튼 클릭
jumpBtn.addEventListener("click", async () => {
  if (!currentTabId) return;
  const profile = await applyProfile();

  chrome.runtime.sendMessage(
    {
      action: "jump",
      tabId: currentTabId,
      profileName: profile?.name
    },
    (res) => {
      if (res?.ok) {
        chrome.runtime.sendMessage({ action: "getStatus", tabId: currentTabId }, (status) => {
          syncUiState(status);
        });
      }
    }
  );
});

// 10. 📌 팝아웃 버튼 클릭
if (popoutBtn) {
  popoutBtn.addEventListener("click", () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html?mode=popout"),
      type: "popup",
      width: 290,
      height: 440,
      focused: true
    });
    window.close();
  });
}

// 11. 설정 페이지 열기
settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
