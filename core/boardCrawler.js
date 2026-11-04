/**
 * 게시판 크롤링 및 ID 추출 모듈 (Cloudflare 대응 및 Rate Limiting 강화)
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * URL에서 게시글 ID를 추출합니다.
 */
function extractId(url, mode, param, regex) {
  try {
    if (mode === "param") {
      const u = new URL(url);
      const value = u.searchParams.get(param);
      if (!value) return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }

    if (mode === "regex") {
      if (!regex) return null;
      const m = url.match(new RegExp(regex));
      if (!m) return null;
      const captured = m[1] ?? m[0];
      const num = Number(captured);
      return Number.isFinite(num) ? num : null;
    }

    // mode === "path" 또는 기본값: URL 경로의 마지막 연속된 숫자
    // 예: /thisthat/18843646 또는 /article/12345.html
    const m = url.match(/\/(\d+)(?:\.[a-zA-Z0-9]+)?(?:\?.*)?$/) || url.match(/\/(\d+)/);
    if (!m) return null;
    const num = Number(m[1]);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

/**
 * 단일 페이지를 크롤링하여 ID 배열 및 응답 상태를 반환합니다.
 */
async function crawlPage(pageUrl, selector, boardFilter, mode, param, regex) {
  try {
    const res = await fetch(pageUrl, {
      method: "GET",
      headers: {
        // 일반 브라우저 헤더 모방
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    // 1. HTTP 403, 429, 503 등 방화벽/속도제한 차단 감지
    if (res.status === 429 || res.status === 403 || res.status === 503) {
      return { ids: [], isBlocked: true, status: res.status };
    }

    if (!res.ok) {
      console.warn(`[Crawler] HTTP 오류 ${res.status}: ${pageUrl}`);
      return { ids: [], isBlocked: false, status: res.status };
    }

    const html = await res.text();

    // 2. Cloudflare Challenge 페이지 본문 감지 (HTTP 200으로 오는 경우 대비)
    if (html.includes("Just a moment...") && (html.includes("_cf_chl_opt") || html.includes("cloudflare"))) {
      return { ids: [], isBlocked: true, status: 403, reason: "Cloudflare 챌린지 감지" };
    }

    const dom = new DOMParser().parseFromString(html, "text/html");
    const base = new URL(pageUrl);
    const ids = [];

    const nodes = dom.querySelectorAll(selector || "a");
    nodes.forEach((node) => {
      const raw = node.getAttribute("href");
      if (!raw) return;

      let href;
      try {
        href = new URL(raw, base).toString();
      } catch {
        return;
      }

      if (boardFilter && !href.includes(boardFilter)) {
        return;
      }

      const id = extractId(href, mode, param, regex);
      if (Number.isFinite(id) && id > 0 && !ids.includes(id)) {
        ids.push(id);
      }
    });

    return { ids, isBlocked: false, status: 200 };
  } catch (err) {
    console.error(`[Crawler] 네트워크 오류 (${pageUrl}):`, err);
    return { ids: [], isBlocked: false, error: err.message };
  }
}

/**
 * 페이지 번호에 따른 전체 URL 생성
 */
function buildPageUrl(listUrl, pageParam, pageNumber, pageType = "param") {
  const url = new URL(listUrl);

  if (pageType === "path") {
    // 라이믹스/XE 가상 경로 방식: https://site.com/board/page/2
    const cleanPath = url.pathname.replace(/\/page\/\d+\/?$/, "");
    url.pathname = `${cleanPath.replace(/\/$/, "")}/page/${pageNumber}`;
    return url.toString();
  }

  // 기본 쿼리 파라미터 방식: https://site.com/board?page=2
  url.searchParams.set(pageParam || "page", String(pageNumber));
  return url.toString();
}

/**
 * 여러 페이지를 순회하며 ID 목록을 수집합니다.
 * @param {Object} options 크롤링 설정 옵션
 */
export async function crawlBoard(options = {}) {
  const {
    listUrl,
    selector = "a",
    boardFilter = "",
    mode = "param",
    param = "number",
    regex = "",
    pageParam = "page",
    pageType = "param", // "param" 또는 "path"
    startPage = 1,
    maxPages = 5,
    delayMs = 1200, // 기본 1.2초로 안전한 딜레이 제공
    onProgress = null
  } = options;

  if (!listUrl) {
    throw new Error("목록 주소(listUrl)가 필요합니다.");
  }

  const result = [];
  const totalPages = Math.max(1, Number(maxPages) || 5);
  const start = Number(startPage) || 1;

  let stoppedReason = null;
  let blockedPage = null;
  let previousPageIds = null;

  for (let i = 0; i < totalPages; i++) {
    const currentPage = start + i;
    const targetUrl = buildPageUrl(listUrl, pageParam, currentPage, pageType);

    if (onProgress) {
      onProgress({
        page: currentPage,
        total: totalPages,
        collectedSoFar: result.length,
        statusText: `${currentPage}/${totalPages} 페이지 수집 중...`
      });
    }

    const res = await crawlPage(
      targetUrl,
      selector,
      boardFilter,
      mode,
      param,
      regex
    );

    // 방화벽 차단 감지
    if (res.isBlocked) {
      stoppedReason = `blocked_${res.status}`;
      blockedPage = currentPage;
      console.warn(`[Crawler] ${currentPage}페이지에서 요청 차단 감지 (HTTP ${res.status})`);
      break;
    }

    // 새 페이지에서 ID가 하나도 없는 경우
    if (res.ids.length === 0) {
      stoppedReason = "empty_page";
      break;
    }

    // 동일한 페이지가 반복되는 경우 (페이지네이션 파라미터가 무시될 때)
    if (
      previousPageIds &&
      res.ids.length === previousPageIds.length &&
      res.ids.every((id, idx) => id === previousPageIds[idx])
    ) {
      console.warn("[Crawler] 이전 페이지와 동일한 글 목록이 반환되어 수집을 종료합니다 (페이지네이션 파라미터 불일치 가능성).");
      stoppedReason = "duplicate_page";
      break;
    }

    previousPageIds = res.ids;
    result.push(...res.ids);

    // 다음 페이지 요청 전 안전 딜레이 (Rate Limiting 방지)
    if (i < totalPages - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const uniqueIds = [...new Set(result)];

  return {
    ids: uniqueIds,
    totalCollected: uniqueIds.length,
    stoppedReason,
    blockedPage,
    totalPagesAttempted: totalPages
  };
}
