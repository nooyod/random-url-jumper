/**
 * 팝업 프로필 선택 및 적용 모듈
 */

export async function loadProfiles() {
  const select = document.getElementById("profile");
  select.innerHTML = "";

  const data = await chrome.storage.local.get(["profiles", "activeProfileName"]);
  const profiles = data.profiles || [];

  if (profiles.length === 0) {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "등록된 프로필 없음";
    select.appendChild(defaultOption);
    return;
  }

  const activeName = data.activeProfileName || profiles[0]?.name;

  profiles.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.name;
    option.textContent = p.name;
    if (p.name === activeName) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

export async function applyProfile() {
  const select = document.getElementById("profile");
  const name = select.value;
  if (!name) return null;

  const data = await chrome.storage.local.get("profiles");
  const profile = (data.profiles || []).find((x) => x.name === name);
  if (!profile) return null;

  await chrome.storage.local.set({
    activeProfileName: profile.name,
    baseUrl: profile.baseUrl,
    mode: profile.mode,
    length: profile.length,
    interval: profile.interval,
    suffix: profile.suffix
  });

  return profile;
}
