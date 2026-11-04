import {
  refreshProfileList,
  loadSelectedProfile,
  resetForm,
  saveProfile,
  deleteCurrentProfile,
  exportAllSettings,
  exportCurrentProfile,
  importSettings,
  showNotice
} from "./profileManager.js";
import { crawlBoard } from "../core/boardCrawler.js";

const el = (id) => document.getElementById(id);

// 초기 프로필 목록 로드
await refreshProfileList();

// 프로필 선택 변경
el("profileList").addEventListener("change", loadSelectedProfile);

// 새로 만들기 버튼
el("newProfileBtn").addEventListener("click", () => {
  el("profileList").value = "";
  resetForm();
});

// 저장 및 삭제 버튼
el("saveBtn").addEventListener("click", saveProfile);
el("deleteBtn").addEventListener("click", deleteCurrentProfile);

// 1. 전체 설정 내보내기 (Export All)
el("exportAllBtn").addEventListener("click", exportAllSettings);

// 2. 현재 선택된 개별 프로필만 내보내기 (Export Single Profile)
el("exportSingleBtn").addEventListener("click", exportCurrentProfile);

// 3. 설정 가져오기 (Import - 전체 및 개별 파일 자동 감지)
el("importBtn").addEventListener("click", () => {
  el("importFileInput").click();
});

el("importFileInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (file) {
    await importSettings(file);
    e.target.value = ""; // 동일 파일 재선택 허용
  }
});

// 생성 모드 변경 (랜덤 vs 크롤링)
el("generator").addEventListener("change", () => {
  const isCrawl = el("generator").value === "crawl";
  el("crawlArea").style.display = isCrawl ? "block" : "none";
  el("randomArea").style.display = isCrawl ? "none" : "block";
});

// ID 추출 모드 변경 (파라미터 vs 정규식 vs 경로 숫자)
el("extractMode").addEventListener("change", () => {
  const mode = el("extractMode").value;
  el("paramField").style.display = mode === "param" ? "block" : "none";
  el("regexField").style.display = mode === "regex" ? "block" : "none";
});

// 크롤링 실행 버튼
el("refreshIdsBtn").addEventListener("click", async () => {
  const listUrl = el("listUrl").value.trim();
  if (!listUrl) {
    showNotice("게시판 목록 주소(List URL)를 입력해주세요.", true);
    el("listUrl").focus();
    return;
  }

  const btn = el("refreshIdsBtn");
  const idCountSpan = el("idCount");
  const crawlTimeSpan = el("crawlTime");

  btn.disabled = true;
  btn.textContent = "⏳ 수집 중...";

  try {
    const config = {
      listUrl,
      selector: el("linkSelector").value.trim() || "a",
      boardFilter: el("boardFilter").value.trim(),
      mode: el("extractMode").value,
      param: el("paramName").value.trim() || "id",
      regex: el("regex").value.trim(),
      pageParam: el("pageParam").value.trim() || "page",
      startPage: Number(el("startPage").value) || 1,
      maxPages: Number(el("maxPages").value) || 5,
      delayMs: 250,
      onProgress: (page, total) => {
        btn.textContent = `⏳ 수집 중 (${page}/${total}페이지)...`;
      }
    };

    const ids = await crawlBoard(config);
    const timeStr = new Date().toLocaleString();

    // 임시 저장 (저장 버튼 누르면 최종 반영)
    await chrome.storage.local.set({
      tempCrawl: {
        ids,
        time: timeStr
      }
    });

    idCountSpan.textContent = String(ids.length);
    crawlTimeSpan.textContent = timeStr;

    showNotice(`크롤링 완료: 총 ${ids.length}개의 게시글 ID를 수집했습니다.`);
  } catch (err) {
    console.error(err);
    showNotice(`크롤링 실패: ${err.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "🔄 목록 수집(크롤링) 실행";
  }
});
