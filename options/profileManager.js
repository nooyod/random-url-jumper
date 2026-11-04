/**
 * 프로필 관리 및 UI 바인딩 모듈
 */

const el = (id) => document.getElementById(id);

/**
 * 인라인 알림 메시지를 표시합니다.
 * @param {string} message 표시할 메시지
 * @param {'success'|'error'|'warning'} type 알림 종류
 * @param {number} duration 지속 시간 (ms)
 */
export function showNotice(message, type = "success", duration = 5000) {
  const box = el("noticeMsg");
  box.textContent = message;

  let className = "notice-msg success";
  if (type === "error" || type === true) {
    className = "notice-msg error";
  } else if (type === "warning") {
    className = "notice-msg warning";
  }

  box.className = className;
  box.style.display = "block";

  if (duration > 0) {
    setTimeout(() => {
      box.style.display = "none";
    }, duration);
  }
}

/**
 * 저장소에서 전체 프로필 목록을 읽어옵니다.
 */
export async function readProfiles() {
  const data = await chrome.storage.local.get("profiles");
  return data.profiles || [];
}

/**
 * 저장소에 전체 프로필 목록을 씁니다.
 */
export async function writeProfiles(profiles) {
  await chrome.storage.local.set({ profiles });
}

/**
 * 상단 프로필 선택 드롭다운을 갱신합니다.
 */
export async function refreshProfileList(selectedName = "") {
  const select = el("profileList");
  select.innerHTML = '<option value="">(새 프로필 만들기)</option>';

  const profiles = await readProfiles();
  profiles.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.textContent = p.name;
    if (p.name === selectedName) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

/**
 * 폼 필드를 초기화하여 새 프로필을 작성할 수 있도록 합니다.
 */
export function resetForm() {
  el("profileName").value = "";
  el("baseUrl").value = "";
  el("suffix").value = "";
  el("interval").value = "10";
  el("generator").value = "random";
  el("mode").value = "number";
  el("length").value = "4";

  el("listUrl").value = "";
  el("linkSelector").value = "a";
  el("boardFilter").value = "";
  el("pageType").value = "param";
  el("pageParam").value = "page";
  el("startPage").value = "1";
  el("maxPages").value = "5";
  el("delaySec").value = "1.2";
  el("extractMode").value = "param";
  el("paramName").value = "id";
  el("regex").value = "";

  el("idCount").textContent = "0";
  el("crawlTime").textContent = "-";

  el("generator").dispatchEvent(new Event("change"));
  el("extractMode").dispatchEvent(new Event("change"));
}

/**
 * 선택된 프로필 데이터를 폼에 채웁니다.
 */
export async function loadSelectedProfile() {
  const name = el("profileList").value;
  if (!name) {
    resetForm();
    return;
  }

  const profiles = await readProfiles();
  const p = profiles.find((x) => x.name === name);
  if (!p) return;

  el("profileName").value = p.name || "";
  el("baseUrl").value = p.baseUrl || "";
  el("suffix").value = p.suffix || "";
  el("interval").value = p.interval ?? 10;
  el("generator").value = p.generator || "random";
  el("mode").value = p.mode || "number";
  el("length").value = p.length ?? 4;

  el("listUrl").value = p.listUrl || "";
  el("linkSelector").value = p.linkSelector || "a";
  el("boardFilter").value = p.boardFilter || "";
  el("pageType").value = p.pageType || "param";
  el("pageParam").value = p.pageParam || "page";
  el("startPage").value = p.startPage ?? 1;
  el("maxPages").value = p.maxPages ?? 5;
  el("delaySec").value = p.delaySec ?? 1.2;
  el("extractMode").value = p.extractMode || "param";
  el("paramName").value = p.paramName || "id";
  el("regex").value = p.regex || "";

  el("idCount").textContent = String(p.cachedIds?.length || 0);
  el("crawlTime").textContent = p.crawledAt || "-";

  el("generator").dispatchEvent(new Event("change"));
  el("extractMode").dispatchEvent(new Event("change"));
}

/**
 * 현재 폼의 입력을 검증하고 프로필로 저장합니다.
 */
export async function saveProfile() {
  const profileName = el("profileName").value.trim();
  const baseUrl = el("baseUrl").value.trim();

  if (!profileName) {
    showNotice("프로필 이름을 입력해주세요.", "error");
    el("profileName").focus();
    return;
  }

  if (!baseUrl) {
    showNotice("기본 주소(Base URL)를 입력해주세요.", "error");
    el("baseUrl").focus();
    return;
  }

  const profiles = await readProfiles();
  const currentSelectedName = el("profileList").value;

  const existingProfile = profiles.find((x) => x.name === currentSelectedName || x.name === profileName);
  const tempData = await chrome.storage.local.get("tempCrawl");

  let cachedIds = existingProfile?.cachedIds || [];
  let crawledAt = existingProfile?.crawledAt || "-";

  if (tempData.tempCrawl) {
    cachedIds = tempData.tempCrawl.ids || [];
    crawledAt = tempData.tempCrawl.time || "-";
    await chrome.storage.local.remove("tempCrawl");
  }

  const profileData = {
    name: profileName,
    baseUrl,
    suffix: el("suffix").value.trim(),
    interval: Math.max(1, Number(el("interval").value) || 10),
    generator: el("generator").value,
    mode: el("mode").value,
    length: Math.max(1, Number(el("length").value) || 4),
    listUrl: el("listUrl").value.trim(),
    linkSelector: el("linkSelector").value.trim() || "a",
    boardFilter: el("boardFilter").value.trim(),
    pageType: el("pageType").value || "param",
    pageParam: el("pageParam").value.trim() || "page",
    startPage: Math.max(0, Number(el("startPage").value) || 1),
    maxPages: Math.max(1, Number(el("maxPages").value) || 5),
    delaySec: Math.max(0.2, Number(el("delaySec").value) || 1.2),
    extractMode: el("extractMode").value,
    paramName: el("paramName").value.trim() || "id",
    regex: el("regex").value.trim(),
    cachedIds,
    crawledAt
  };

  const idx = profiles.findIndex((x) => x.name === (currentSelectedName || profileName));
  if (idx >= 0) {
    profiles[idx] = profileData;
  } else {
    profiles.push(profileData);
  }

  await writeProfiles(profiles);

  // 저장된 프로필을 활성 프로필로 지정
  await chrome.storage.local.set({
    activeProfileName: profileName,
    baseUrl: profileData.baseUrl,
    mode: profileData.mode,
    length: profileData.length,
    interval: profileData.interval,
    suffix: profileData.suffix
  });

  await refreshProfileList(profileName);
  showNotice(`'${profileName}' 프로필이 저장되었습니다.`, "success");
}

/**
 * 현재 선택된 프로필을 삭제합니다.
 */
export async function deleteCurrentProfile() {
  const select = el("profileList");
  const name = select.value;

  if (!name) {
    showNotice("삭제할 프로필을 선택해주세요.", "error");
    return;
  }

  if (!confirm(`'${name}' 프로필을 정말 삭제하시겠습니까?`)) {
    return;
  }

  let profiles = await readProfiles();
  profiles = profiles.filter((x) => x.name !== name);
  await writeProfiles(profiles);

  await refreshProfileList("");
  resetForm();
  showNotice(`'${name}' 프로필이 삭제되었습니다.`, "success");
}

function triggerJsonDownload(dataObject, fileName) {
  const jsonString = JSON.stringify(dataObject, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

export async function exportAllSettings() {
  const data = await chrome.storage.local.get(["profiles", "activeProfileName"]);
  const profiles = data.profiles || [];

  if (profiles.length === 0) {
    showNotice("내보낼 프로필 데이터가 없습니다.", "error");
    return;
  }

  const exportPayload = {
    app: "Random URL Jumper",
    type: "all_settings",
    version: "2.1",
    exportedAt: new Date().toISOString(),
    activeProfileName: data.activeProfileName || "",
    profiles
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerJsonDownload(exportPayload, `random-url-jumper-all-settings-${dateStr}.json`);
  showNotice("전체 설정 파일이 다운로드되었습니다.", "success");
}

export async function exportCurrentProfile() {
  const currentName = el("profileList").value || el("profileName").value.trim();
  if (!currentName) {
    showNotice("내보낼 프로필을 먼저 선택하거나 저장해주세요.", "error");
    return;
  }

  const profiles = await readProfiles();
  const profile = profiles.find((x) => x.name === currentName);

  if (!profile) {
    showNotice(`'${currentName}' 프로필 정보를 찾을 수 없습니다. 먼저 저장해주세요.`, "error");
    return;
  }

  const exportPayload = {
    app: "Random URL Jumper",
    type: "single_profile",
    version: "2.1",
    exportedAt: new Date().toISOString(),
    profile
  };

  const safeName = profile.name.replace(/[\\/:*?"<>|]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerJsonDownload(exportPayload, `profile-${safeName}-${dateStr}.json`);
  showNotice(`'${profile.name}' 프로필 파일이 다운로드되었습니다.`, "success");
}

export async function importSettings(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.type === "single_profile" || (data.profile && data.profile.name && data.profile.baseUrl)) {
      const incoming = data.profile || data;
      if (!incoming.name || !incoming.baseUrl) {
        showNotice("유효하지 않은 프로필 파일입니다 (이름, 주소 누락).", "error");
        return;
      }

      let profiles = await readProfiles();
      const existingIdx = profiles.findIndex((p) => p.name === incoming.name);

      if (existingIdx >= 0) {
        if (!confirm(`'${incoming.name}' 프로필이 이미 존재합니다. 덮어쓰시겠습니까?`)) {
          return;
        }
        profiles[existingIdx] = incoming;
      } else {
        profiles.push(incoming);
      }

      await writeProfiles(profiles);
      await refreshProfileList(incoming.name);
      await loadSelectedProfile();
      showNotice(`'${incoming.name}' 프로필을 성공적으로 가져왔습니다.`, "success");
      return;
    }

    let incomingProfiles = [];
    if (Array.isArray(data.profiles)) {
      incomingProfiles = data.profiles;
    } else if (Array.isArray(data)) {
      incomingProfiles = data;
    } else {
      showNotice("올바르지 않은 설정 파일 형식입니다.", "error");
      return;
    }

    const validProfiles = incomingProfiles.filter(
      (p) => p && typeof p.name === "string" && typeof p.baseUrl === "string"
    );

    if (validProfiles.length === 0) {
      showNotice("가져올 유효한 프로필이 파일에 없습니다.", "error");
      return;
    }

    const shouldMerge = confirm(
      `총 ${validProfiles.length}개의 프로필을 가져옵니다.\n\n[확인]: 기존 프로필과 병합 (이름 중복 시 덮어쓰기)\n[취소]: 기존 프로필을 지우고 전체 교체`
    );

    let finalProfiles = [];
    if (shouldMerge) {
      const existing = await readProfiles();
      const profileMap = new Map();
      existing.forEach((p) => profileMap.set(p.name, p));
      validProfiles.forEach((p) => profileMap.set(p.name, p));
      finalProfiles = Array.from(profileMap.values());
    } else {
      finalProfiles = validProfiles;
    }

    const targetActiveName = data.activeProfileName || finalProfiles[0]?.name || "";

    await writeProfiles(finalProfiles);

    if (targetActiveName) {
      const activeProf = finalProfiles.find((p) => p.name === targetActiveName) || finalProfiles[0];
      await chrome.storage.local.set({
        activeProfileName: activeProf.name,
        baseUrl: activeProf.baseUrl,
        mode: activeProf.mode,
        length: activeProf.length,
        interval: activeProf.interval,
        suffix: activeProf.suffix
      });
    }

    await refreshProfileList(targetActiveName);
    await loadSelectedProfile();
    showNotice(`총 ${validProfiles.length}개의 프로필을 성공적으로 가져왔습니다.`, "success");
  } catch (err) {
    console.error("[Import] 오류:", err);
    showNotice(`설정 파일을 읽는 중 오류가 발생했습니다: ${err.message}`, "error");
  }
}
