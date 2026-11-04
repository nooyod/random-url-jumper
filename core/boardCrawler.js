/**
 * 게시판 크롤링 및 ID 추출 모듈
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
    const m = url.match(/\/(\d+)(?:\D*)$/) || url.match(/(\d+)/);
    if (!m) return null;
    const num = Number(m[1]);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

/**
 * 단일 페이지를 크롤링하여 ID 배열을 반환합니다.
 */
async function crawlPage(pageUrl, selector, boardFilter, mode, param, regex) {
  try {
    const res = await fetch(pageUrl);
    if (!res.ok) {
      console.warn(`[Crawler] HTTP ${res.status}: ${pageUrl}`);
      return [];
    }

    const html = await res.text();
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

    return ids;
  } catch (err) {
    console.error(`[Crawler] 페이지 크롤링 오류 (${pageUrl}):`, err);
    return [];
  }
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
    startPage = 1,
    maxPages = 10,
    delayMs = 200,
    onProgress = null
  } = options;

  if (!listUrl) {
    throw new Error("목록 주소(listUrl)가 필요합니다.");
  }

  const result = [];
  const totalPages = Math.max(1, Number(maxPages) || 10);
  const start = Number(startPage) || 1;

  for (let i = 0; i < totalPages; i++) {
    const currentPage = start + i;
    const url = new URL(listUrl);
    url.searchParams.set(pageParam, String(currentPage));

    if (onProgress) {
      onProgress(currentPage, totalPages);
    }

    const ids = await crawlPage(
      url.toString(),
      selector,
      boardFilter,
      mode,
      param,
      regex
    );

    // 새 페이지에서 ID를 전혀 찾지 못한 경우 순회 중단
    if (ids.length === 0) {
      break;
    }

    result.push(...ids);

    // 웹 서버 과부하 방지 딜레이
    if (delayMs > 0 && i < totalPages - 1) {
      await sleep(delayMs);
    }
  }

  // 중복 제거 후 반환
  return [...new Set(result)];
}
