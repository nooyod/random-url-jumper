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

  // 1. 이토랜드 (etoland.co.kr) - 슬러그/제목이 URL에 필수인 대표 사이트
  if (host.includes("etoland.co.kr")) {
    const match = path.match(/^\/b\/([a-zA-Z0-9_-]+)/);
    const board = match ? match[1] : "etohumor07";
    const category = searchParams.get("category") || "";

    return {
      siteName: `이토랜드 (${board}${category ? ` - ${category}` : ""})`,
      baseUrl: `https://etoland.co.kr/b/${board}/view/`,
      listUrl: `https://etoland.co.kr/b/${board}${category ? `?category=${encodeURIComponent(category)}` : ""}`,
      boardFilter: category ? `category=${category}` : `/b/${board}/view/`,
      linkSelector: "a[href*='/view/']",
      extractMode: "full", // ⭐ 슬러그 필수 사이트이므로 전체 URL 모드 적용!
      paramName: "id",
      pageParam: "page",
      pageType: "param",
      delaySec: 1.0,
      suffix: ""
    };
  }

  // 2. 디시인사이드 (dcinside.com)
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
      pageType: "param",
      delaySec: 1.0,
      suffix: ""
    };
  }

  // 3. 꾸르 (ggoorr.net) 및 라이믹스/XE 계열
  if (host.includes("ggoorr.net")) {
    const match = path.match(/^\/([a-zA-Z0-9_-]+)/);
    const board = match ? match[1] : "thisthat";
    return {
      siteName: `꾸르 (${board})`,
      baseUrl: `https://ggoorr.net/${board}/`,
      listUrl: `https://ggoorr.net/${board}`,
      boardFilter: `/${board}/`,
      linkSelector: ".title a, a.hx, td.title a",
      extractMode: "path",
      paramName: "id",
      pageParam: "page",
      pageType: "param",
      delaySec: 1.5,
      suffix: ""
    };
  }

  // 4. 아카라이브 (arca.live)
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
      pageType: "param",
      delaySec: 1.2,
      suffix: ""
    };
  }

  // 5. 루리웹 (ruriweb.com)
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
      pageType: "param",
      delaySec: 1.0,
      suffix: ""
    };
  }

  // 6. 에펨코리아 (fmkorea.com)
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
        pageType: "param",
        delaySec: 1.5,
        suffix: ""
      };
    }

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
      pageType: "param",
      delaySec: 1.5,
      suffix: ""
    };
  }

  // 7. 클리앙 (clien.net)
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
      pageType: "param",
      delaySec: 1.0,
      suffix: ""
    };
  }

  // 8. 더쿠 (theqoo.net)
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
      pageType: "param",
      delaySec: 1.0,
      suffix: ""
    };
  }

  // 9. 그누보드 계열
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
      pageType: "param",
      delaySec: 1.0,
      suffix: ""
    };
  }

  return null;
}

/**
 * 일반적인 URL 패턴 휴리스틱 분석
 */
function analyzeGenericUrl(parsedUrl) {
  const searchParams = parsedUrl.searchParams;

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
        pageType: "param",
        delaySec: 1.2,
        suffix: ""
      };
    }
  }

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
        pageType: "param",
        delaySec: 1.2,
        suffix: ""
      };
    }
  }

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
      pageType: "param",
      delaySec: 1.2,
      suffix
    };
  }

  return {
    siteName: parsedUrl.hostname,
    baseUrl: parsedUrl.href,
    listUrl: `${parsedUrl.origin}${parsedUrl.pathname}`,
    boardFilter: "",
    linkSelector: "a",
    extractMode: "param",
    paramName: "id",
    pageParam: "page",
    pageType: "param",
    delaySec: 1.2,
    suffix: ""
  };
}

async function fetchAdditionalInfo(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;

    const html = await res.text();
    const dom = new DOMParser().parseFromString(html, "text/html");

    let pageTitle = dom.querySelector("title")?.textContent?.trim() || "";
    if (pageTitle) {
      pageTitle = pageTitle
        .split(/[-|_|::]/)
        .pop()
        .trim();
    }

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

export async function analyzePostUrl(sampleUrl) {
  if (!sampleUrl || typeof sampleUrl !== "string") {
    throw new Error("유효한 URL을 입력해주세요.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(sampleUrl.trim());
  } catch {
    throw new Error("올바른 웹사이트 URL 형식이 아닙니다.");
  }

  let result = matchPresets(parsedUrl) || analyzeGenericUrl(parsedUrl);

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
    pageType: result.pageType || "param",
    delaySec: result.delaySec || 1.2,
    suffix: result.suffix,
    generator: "crawl",
    interval: 10,
    startPage: 1,
    maxPages: 5
  };
}
