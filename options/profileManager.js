async function getProfiles() {

    const data =
        await chrome.storage.local.get(
            "profiles"
        );

    return data.profiles || [];

}

async function setProfiles(
    profiles
) {

    await chrome.storage.local.set({

        profiles

    });

}


// DOM 가져오기
function el(id) {

    return document.getElementById(
        id
    );

}


// 목록 표시
export async function refreshProfiles() {

    const list =
        el(
            "profileList"
        );

    list.innerHTML = "";

    const empty =
        document.createElement(
            "option"
        );

    empty.value = "";

    empty.text = "새 프로필";

    list.appendChild(
        empty
    );

    const profiles =
        await getProfiles();

    profiles.forEach(

        p => {

            const o =
                document.createElement(
                    "option"
                );

            o.value =
                p.name;

            o.text =
                p.name;

            list.appendChild(
                o
            );

        }

    );

}


// 프로필 로드
export async function loadSelected() {

    const selected =
        el(
            "profileList"
        ).value;

    if (!selected)
        return;

    const profiles =
        await getProfiles();

    const p =
        profiles.find(

            x =>

                x.name === selected

        );

    if (!p)
        return;

    el("profileName").value =
        p.name;

    el("baseUrl").value =
        p.baseUrl;

    el("mode").value =
        p.mode;

    el("length").value =
        p.length;

    el("interval").value =
        p.interval;

    el("suffix").value =
        p.suffix || "";

}


// 저장
export async function saveProfile() {

    const name =
        el(
            "profileName"
        )
            .value
            .trim();

    if (!name) {

        alert(
            "프로필 이름 입력"
        );

        return;

    }

    const profiles =
        await getProfiles();

    const item = {

        name,

        baseUrl:
            el("baseUrl").value,

        mode:
            el("mode").value,

        length:
            Number(
                el("length").value
            ),

        interval:
            Number(
                el("interval").value
            ),

        suffix:
            el("suffix").value

    };

    const idx =

        profiles.findIndex(

            x =>

                x.name === name

        );

    if (
        idx >= 0
    ) {

        profiles[idx] = item;

    }

    else {

        profiles.push(
            item
        );

    }

    await setProfiles(
        profiles
    );

    await refreshProfiles();

    el(
        "profileList"
    ).value = name;

    alert(
        "저장 완료"
    );

}


// 삭제
export async function deleteCurrent() {

    const selected =
        el(
            "profileList"
        ).value;

    if (!selected)
        return;

    const profiles =
        await getProfiles();

    const remain =

        profiles.filter(

            x =>

                x.name !== selected

        );

    await setProfiles(
        remain
    );

    await refreshProfiles();

    [
        "profileName",
        "baseUrl",
        "suffix"

    ]

        .forEach(

            id =>

                el(id).value = ""

        );

    el(
        "mode"
    ).value = "number";

    el(
        "length"
    ).value = 4;

    el(
        "interval"
    ).value = 10;

    alert(
        "삭제 완료"
    );

}