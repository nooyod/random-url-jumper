/**
 * 게시판 크롤링 및 ID/URL 추출 모듈
 * (Cloudflare 완전 우회 대응: credentials 포함, 브라우저 헤더 모방, 자동 재시도)
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * URL에서 게시글 ID 또는 전체 URL을 추출합니다.
 */
function extractTarget(url, mode, param, regex) {
  try {
    if (mode === "full") {
      return url;
    }

    if (mode === "param") {
      const u = new URL(url);
      const value = u.searchParams.get(param);
      if (!value) return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : value;
    }

    if (mode === "regex") {
      if (!regex) return null;
      const m = url.match(new RegExp(regex));
      if (!m) return null;
      const captured = m[1] ?? m[0];
      const num = Number(captured);
      return Number.isFinite(num) ? num : captured;
    }

    // 경로(path) 모드: 슬러그 뒤 하이픈 숫자(-12345) 또는 슬래시 직후 숫자(/12345)
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
 * 단일 페이지 요청 함수 (브라우저 쿠키 credentials 포함 및 네비게이션 헤더 모방)
 */
async function fetchPageHtml(pageUrl) {
  const res = await fetch(pageUrl, {
    method: "GET",
    // ⭐ Cloudflare 통과 쿠키(cf_clearance) 및 세션 쿠키를 반드시 포함하여 전송!
    credentials: "include",
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "max-age=0",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    }
  });

  return res;
}

/**
 * 단일 페이지를 크롤링하여 ID 또는 URL 목록을 수집합니다.
 * (일시적 403/429 발생 시 2.5초 대기 후 1회 자동 재시도)
 */
async function crawlPage(pageUrl, selector, boardFilter, mode, param, regex, isRetry = false) {
  try {
    let res = await fetchPageHtml(pageUrl);

    // 403, 429 또는 503 감지 시 1회 재시도 (재시도 플래그가 없을 때)
    if ((res.status === 429 || res.status === 403 || res.status === 503) && !isRetry) {
      console.warn(`[Crawler] ${pageUrl} 에서 HTTP ${res.status} 감지. 2.5초 후 1회 자동 재시도합니다...`);
      await sleep(2500);
      return await crawlPage(pageUrl, selector, boardFilter, mode, param, regex, true);
    }

    if (res.status === 429 || res.status === 403 || res.status === 503) {
      return { items: [], isBlocked: true, status: res.status };
    }

    if (!res.ok) {
      console.warn(`[Crawler] HTTP 오류 ${res.status}: ${pageUrl}`);
      return { items: [], isBlocked: false, status: res.status };
    }

    const html = await res.text();

    if (html.includes("Just a moment...") && (html.includes("_cf_chl_opt") || html.includes("cloudflare"))) {
      if (!isRetry) {
        console.warn(`[Crawler] Cloudflare 챌린지 감지. 2.5초 후 1회 재시도...`);
        await sleep(2500);
        return await crawlPage(pageUrl, selector, boardFilter, mode, param, regex, true);
      }
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

      // 한글 카테고리 필터링 지원
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
    delayMs = 1500, // 기본 1.5초로 안정적 딜레이 제공
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
