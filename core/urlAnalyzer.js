/**
 * 게시글 URL 분석 및 설정 자동 생성 모듈
 */

const KNOWN_ID_PARAMS = [
  "no",
  "wr_id",
  "document_srl",
  "article_id",
  "id",
  "b_no",
  "seq",
  "idx",
  "post_id",
  "content_id",
  "num"
];

/**
 * 알려진 국내외 주요 커뮤니티의 URL 구조 프리셋 매칭
 */
function matchPresets(parsedUrl) {
  const host = parsedUrl.hostname.toLowerCase();
  const path = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // 1. 디시인사이드 (dcinside.com)
  if (host.includes("dcinside.com")) {
    const gallId = searchParams.get("id") || "";
    const isMgal = path.includes("mgallery") || path.includes("mini");
    const prefix = isMgal ? (path.includes("mini") ? "/mini/board" : "/mgallery/board") : "/board";

    return {
      siteName: `디시인사이드 (${gallId || "갤러리"})`,
      baseUrl: `${parsedUrl.origin}${prefix}/view/?id=${gallId}&no=`,
      listUrl: `${parsedUrl.origin}${prefix}/lists/?id=${gallId}`,
      boardFilter: gallId ? `id=${gallId}` : "",
      linkSelector: "td.gall_tit a, .gall_list a.tit",
      extractMode: "param",
      paramName: "no",
      pageParam: "page",
      suffix: ""
    };
  }

  // 2. 아카라이브 (arca.live)
  if (host.includes("arca.live")) {
    const match = path.match(/^\/b\/([a-zA-Z0-9_-]+)/);
    const channel = match ? match[1] : "";
    return {
      siteName: `아카라이브 (${channel || "채널"})`,
      baseUrl: `https://arca.live/b/${channel}/`,
      listUrl: `https://arca.live/b/${channel}`,
      boardFilter: `/b/${channel}/`,
      linkSelector: "a.title, .article-list a",
      extractMode: "path",
      paramName: "id",
      pageParam: "p",
      suffix: ""
    };
  }

  // 3. 루리웹 (ruriweb.com)
  if (host.includes("ruriweb.com")) {
    const match = path.match(/^(.*\/board\/\d+)/);
    const basePath = match ? match[1] : path;
    return {
      siteName: "루리웹",
      baseUrl: `${parsedUrl.origin}${basePath}/read/`,
      listUrl: `${parsedUrl.origin}${basePath}`,
      boardFilter: "/read/",
      linkSelector: "a.subject_link, td.subject a",
      extractMode: "path",
      paramName: "id",
      pageParam: "page",
      suffix: ""
    };
  }

  // 4. 에펨코리아 (fmkorea.com)
  if (host.includes("fmkorea.com")) {
    const mid = searchParams.get("mid");
    const docSrl = searchParams.get("document_srl");

    if (mid && docSrl) {
      return {
        siteName: `에펨코리아 (${mid})`,
        baseUrl: `${parsedUrl.origin}/index.php?mid=${mid}&document_srl=`,
        listUrl: `${parsedUrl.origin}/index.php?mid=${mid}`,
        boardFilter: `mid=${mid}`,
        linkSelector: ".title a, a.hx",
        extractMode: "param",
        paramName: "document_srl",
        pageParam: "page",
        suffix: ""
      };
    }

    // RESTful 형태 (fmkorea.com/12345 또는 fmkorea.com/best/12345)
    const match = path.match(/^(.*)\/(\d+)$/);
    const listPath = match ? match[1] : "";
    return {
      siteName: "에펨코리아",
      baseUrl: `${parsedUrl.origin}${listPath}/`,
      listUrl: `${parsedUrl.origin}${listPath || "/best"}`,
      boardFilter: "",
      linkSelector: ".title a, a.hx",
      extractMode: "path",
      paramName: "id",
      pageParam: "page",
      suffix: ""
    };
  }

  // 5. 클리앙 (clien.net)
  if (host.includes("clien.net")) {
    const match = path.match(/^(.*\/service\/board\/[a-zA-Z0-9_-]+)/);
    const basePath = match ? match[1] : path;
    return {
      siteName: "클리앙",
      baseUrl: `${parsedUrl.origin}${basePath}/`,
      listUrl: `${parsedUrl.origin}${basePath}`,
      boardFilter: basePath,
      linkSelector: "a.list_subject, a.subject_fixed",
      extractMode: "path",
      paramName: "id",
      pageParam: "po",
      suffix: ""
    };
  }

  // 6. 더쿠 (theqoo.net)
  if (host.includes("theqoo.net")) {
    const match = path.match(/^\/([a-zA-Z0-9_-]+)/);
    const board = match ? match[1] : "";
    return {
      siteName: `더쿠 (${board})`,
      baseUrl: `https://theqoo.net/${board}/`,
      listUrl: `https://theqoo.net/${board}`,
      boardFilter: `/${board}/`,
      linkSelector: "td.title a, .theqoo_document_title",
      extractMode: "path",
      paramName: "id",
      pageParam: "page",
      suffix: ""
    };
  }

  // 7. 그누보드 계열 (bbs/board.php?bo_table=xxx&wr_id=123)
  if (path.includes("board.php") && searchParams.has("bo_table") && searchParams.has("wr_id")) {
    const table = searchParams.get("bo_table");
    return {
      siteName: `그누보드 (${table})`,
      baseUrl: `${parsedUrl.origin}${parsedUrl.pathname}?bo_table=${table}&wr_id=`,
      listUrl: `${parsedUrl.origin}${parsedUrl.pathname}?bo_table=${table}`,
      boardFilter: `bo_table=${table}`,
      linkSelector: "td.td_subject a, .tbl_head01 a",
      extractMode: "param",
      paramName: "wr_id",
      pageParam: "page",
      suffix: ""
    };
  }

  return null;
}

/**
 * 일반적인 URL 패턴 휴리스틱 분석 (파라미터형 vs 경로형)
 */
function analyzeGenericUrl(parsedUrl) {
  const searchParams = parsedUrl.searchParams;

  // A. 쿼리 파라미터형 분석
  // 1) 알려진 ID 키가 있는지 확인
  for (const key of KNOWN_ID_PARAMS) {
    if (searchParams.has(key) && /^\d+$/.test(searchParams.get(key))) {
      const listParams = new URLSearchParams(searchParams);
      listParams.delete(key);

      const baseParams = new URLSearchParams(searchParams);
      baseParams.set(key, "");

      const baseSearch = baseParams.toString();
      const listSearch = listParams.toString();

      return {
        siteName: `${parsedUrl.hostname} 게시판`,
        baseUrl: `${parsedUrl.origin}${parsedUrl.pathname}?${baseSearch}`,
        listUrl: `${parsedUrl.origin}${parsedUrl.pathname}${listSearch ? `?${listSearch}` : ""}`,
        boardFilter: listSearch,
        linkSelector: "a",
        extractMode: "param",
        paramName: key,
        pageParam: "page",
        suffix: ""
      };
    }
  }

  // 2) 값이 숫자인 임의의 파라미터가 있는지 확인
  for (const [k, v] of searchParams.entries()) {
    if (/^\d{2,}$/.test(v)) {
      const listParams = new URLSearchParams(searchParams);
      listParams.delete(k);

      const baseParams = new URLSearchParams(searchParams);
      baseParams.set(k, "");

      return {
        siteName: `${parsedUrl.hostname} (${k})`,
        baseUrl: `${parsedUrl.origin}${parsedUrl.pathname}?${baseParams.toString()}`,
        listUrl: `${parsedUrl.origin}${parsedUrl.pathname}${listParams.toString() ? `?${listParams.toString()}` : ""}`,
        boardFilter: "",
        linkSelector: "a",
        extractMode: "param",
        paramName: k,
        pageParam: "page",
        suffix: ""
      };
    }
  }

  // B. 경로형 (RESTful URL) 분석: 끝부분이 /12345 또는 /12345.html
  const pathMatch = parsedUrl.pathname.match(/^(.*\/)(\d+)(\.[a-zA-Z0-9]+)?$/);
  if (pathMatch) {
    const basePath = pathMatch[1];
    const suffix = pathMatch[3] || "";

    return {
      siteName: `${parsedUrl.hostname} 게시판`,
      baseUrl: `${parsedUrl.origin}${basePath}`,
      listUrl: `${parsedUrl.origin}${basePath.replace(/\/$/, "")}`,
      boardFilter: basePath,
      linkSelector: "a",
      extractMode: "path",
      paramName: "id",
      pageParam: "page",
      suffix
    };
  }

  // C. 최후의 폴백 (URL 기본 분할)
  return {
    siteName: parsedUrl.hostname,
    baseUrl: parsedUrl.href,
    listUrl: `${parsedUrl.origin}${parsedUrl.pathname}`,
    boardFilter: "",
    linkSelector: "a",
    extractMode: "param",
    paramName: "id",
    pageParam: "page",
    suffix: ""
  };
}

/**
 * 웹페이지 HTML을 비동기로 요청하여 추가 힌트(제목, 진짜 목록 링크) 수집
 */
async function fetchAdditionalInfo(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;

    const html = await res.text();
    const dom = new DOMParser().parseFromString(html, "text/html");

    // 1. 페이지 제목 추출
    let pageTitle = dom.querySelector("title")?.textContent?.trim() || "";
    if (pageTitle) {
      // 흔한 사이트명 접미사/구분자 정돈 (예: "글제목 - 디시인사이드" -> "디시인사이드")
      pageTitle = pageTitle
        .split(/[-|_|::]/)
        .pop()
        .trim();
    }

    // 2. 목록 링크(List button) 탐색
    let detectedListUrl = null;
    const listLinkNodes = dom.querySelectorAll("a");
    for (const a of listLinkNodes) {
      const text = (a.textContent || "").trim();
      const href = a.getAttribute("href") || "";

      if (
        (text === "목록" || text === "목록으로" || text.toLowerCase() === "list") &&
        href &&
        !href.startsWith("#") &&
        !href.startsWith("javascript:")
      ) {
        try {
          detectedListUrl = new URL(href, url).toString();
          break;
        } catch {}
      }
    }

    return { pageTitle, detectedListUrl };
  } catch (e) {
    console.warn("[UrlAnalyzer] 웹페이지 스캔 생략/실패:", e);
    return null;
  }
}

/**
 * 샘플 게시글 URL을 분석하여 완성된 프로필 설정 객체를 반환합니다.
 * @param {string} sampleUrl 분석할 게시글 주소
 */
export async function analyzePostUrl(sampleUrl) {
  if (!sampleUrl || typeof sampleUrl !== "string") {
    throw new Error("유효한 URL을 입력해주세요.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(sampleUrl.trim());
  } catch {
    throw new Error("올바른 웹사이트 URL 형식이 아닙니다. (http:// 또는 https:// 포함 필요)");
  }

  // 1. 프리셋 또는 패턴 분석
  let result = matchPresets(parsedUrl) || analyzeGenericUrl(parsedUrl);

  // 2. 추가 정보(HTML 웹페이지) 비동기 스캔 시도
  const extra = await fetchAdditionalInfo(sampleUrl.trim());
  if (extra) {
    if (extra.pageTitle && extra.pageTitle.length >= 2) {
      result.siteName = extra.pageTitle;
    }
    if (extra.detectedListUrl) {
      result.listUrl = extra.detectedListUrl;
    }
  }

  return {
    name: result.siteName,
    baseUrl: result.baseUrl,
    listUrl: result.listUrl,
    boardFilter: result.boardFilter,
    linkSelector: result.linkSelector,
    extractMode: result.extractMode,
    paramName: result.paramName,
    pageParam: result.pageParam,
    suffix: result.suffix,
    generator: "crawl",
    interval: 10,
    startPage: 1,
    maxPages: 5
  };
}
