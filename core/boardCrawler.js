/**
 * 게시판 크롤링 및 ID/URL 추출 모듈 (Cloudflare 대응, 전체 URL 모드 및 한글 필터 지원)
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * URL에서 게시글 ID 또는 전체 URL을 추출합니다.
 */
function extractTarget(url, mode, param, regex) {
  try {
    // 1. 전체 링크(Full URL) 모드: 슬러그/제목이 필수인 사이트 대응
    if (mode === "full") {
      return url;
    }

    // 2. 쿼리 파라미터 모드
    if (mode === "param") {
      const u = new URL(url);
      const value = u.searchParams.get(param);
      if (!value) return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : value;
    }

    // 3. 정규표현식 모드
    if (mode === "regex") {
      if (!regex) return null;
      const m = url.match(new RegExp(regex));
      if (!m) return null;
      const captured = m[1] ?? m[0];
      const num = Number(captured);
      return Number.isFinite(num) ? num : captured;
    }

    // 4. 경로(path) 모드: 슬러그 뒤 하이픈 숫자(-12345) 또는 슬래시 직후 숫자(/12345)
    const slugMatch = url.match(/-(\d+)(?:\.[a-zA-Z0-9]+)?(?:\?.*)?$/);
    if (slugMatch) {
      const num = Number(slugMatch[1]);
      if (Number.isFinite(num)) return num;
    }

    const m = url.match(/\/(\d+)(?:\.[a-zA-Z0-9]+)?(?:\?.*)?$/) || url.match(/\/(\d+)/);
    if (!m) return null;
    const num = Number(m[1]);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

/**
 * 단일 페이지를 크롤링하여 ID 또는 URL 목록을 수집합니다.
 */
async function crawlPage(pageUrl, selector, boardFilter, mode, param, regex) {
  try {
    const res = await fetch(pageUrl, {
      method: "GET",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (res.status === 429 || res.status === 403 || res.status === 503) {
      return { items: [], isBlocked: true, status: res.status };
    }

    if (!res.ok) {
      console.warn(`[Crawler] HTTP 오류 ${res.status}: ${pageUrl}`);
      return { items: [], isBlocked: false, status: res.status };
    }

    const html = await res.text();

    if (html.includes("Just a moment...") && (html.includes("_cf_chl_opt") || html.includes("cloudflare"))) {
      return { items: [], isBlocked: true, status: 403, reason: "Cloudflare 챌린지 감지" };
    }

    const dom = new DOMParser().parseFromString(html, "text/html");
    const base = new URL(pageUrl);
    const items = [];

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

      // 🔍 한글 카테고리 필터링 지원 (인코딩/디코딩 양방향 매칭)
      if (boardFilter) {
        let isMatched = false;
        try {
          const decodedHref = decodeURIComponent(href);
          const filterLower = boardFilter.toLowerCase();
          if (
            href.toLowerCase().includes(filterLower) ||
            decodedHref.toLowerCase().includes(filterLower)
          ) {
            isMatched = true;
          }
        } catch {
          if (href.includes(boardFilter)) {
            isMatched = true;
          }
        }

        if (!isMatched) {
          return;
        }
      }

      const item = extractTarget(href, mode, param, regex);
      if (item !== null && item !== undefined && !items.includes(item)) {
        items.push(item);
      }
    });

    return { items, isBlocked: false, status: 200 };
  } catch (err) {
    console.error(`[Crawler] 네트워크 오류 (${pageUrl}):`, err);
    return { items: [], isBlocked: false, error: err.message };
  }
}

function buildPageUrl(listUrl, pageParam, pageNumber, pageType = "param") {
  const url = new URL(listUrl);

  if (pageType === "path") {
    const cleanPath = url.pathname.replace(/\/page\/\d+\/?$/, "");
    url.pathname = `${cleanPath.replace(/\/$/, "")}/page/${pageNumber}`;
    return url.toString();
  }

  url.searchParams.set(pageParam || "page", String(pageNumber));
  return url.toString();
}

/**
 * 여러 페이지를 순회하며 ID 또는 URL 목록을 수집합니다.
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
    pageType = "param",
    startPage = 1,
    maxPages = 5,
    delayMs = 1200,
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
  let previousPageItems = null;

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

    if (res.isBlocked) {
      stoppedReason = `blocked_${res.status}`;
      blockedPage = currentPage;
      break;
    }

    if (res.items.length === 0) {
      stoppedReason = "empty_page";
      break;
    }

    if (
      previousPageItems &&
      res.items.length === previousPageItems.length &&
      res.items.every((it, idx) => it === previousPageItems[idx])
    ) {
      stoppedReason = "duplicate_page";
      break;
    }

    previousPageItems = res.items;
    result.push(...res.items);

    if (i < totalPages - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const uniqueItems = [...new Set(result)];

  return {
    ids: uniqueItems,
    totalCollected: uniqueItems.length,
    stoppedReason,
    blockedPage,
    totalPagesAttempted: totalPages
  };
}
