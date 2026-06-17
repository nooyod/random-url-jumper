function el(id) {

    return document.getElementById(id);

}

async function read() {

    const data =

        await chrome.storage.local.get(
            "profiles"
        );

    return data.profiles || [];

}

async function write(
    profiles
) {

    await chrome.storage.local.set({

        profiles

    });

}

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

    empty.textContent = "새 프로필";

    list.appendChild(
        empty);

    const profiles =

        await read();

    profiles.forEach(

        p => {

            const o =
                document.createElement(
                    "option"
                );

            o.value = p.name;

            o.textContent = p.name;

            list.appendChild(
                o);

        }

    );

}

export async function loadSelected() {

    const name =
        el(
            "profileList"
        ).value;

    if (!name)
        return;

    const profiles =

        await read();

    const p =

        profiles.find(

            x =>

                x.name === name

        );

    if (!p)
        return;

    [
        "profileName",
        "baseUrl",
        "generator",
        "listUrl",
        "extractMode",
        "mode",
        "length",
        "interval",
        "suffix"

    ]

        .forEach(

            k => {

                if (
                    el(k)
                )

                    el(k).value =

                        p[k]

                        ??

                        "";

            }

        );

    el(
        "count"
    )

        .textContent =

        `${(p.cachedIds || []).length}개 수집됨`;

}

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

        await read();

    const ids =

        (
            await chrome
                .storage
                .local
                .get(
                    "tempIds"
                )

        )

            .tempIds

        ||

        [];

    const profile = {

        name,

        baseUrl:
            el(
                "baseUrl"
            ).value,

        generator:
            el(
                "generator"
            ).value,

        listUrl:
            el(
                "listUrl"
            ).value,

        extractMode:
            el(
                "extractMode"
            ).value,

        mode:
            el(
                "mode"
            ).value,

        length:
            Number(
                el(
                    "length"
                ).value
            ),

        interval:
            Number(
                el(
                    "interval"
                ).value
            ),

        suffix:
            el(
                "suffix"
            ).value,

        cachedIds:
            ids

    };

    const idx =

        profiles.findIndex(

            x =>

                x.name === name

        );

    if (
        idx >= 0
    )

        profiles[idx] = profile;

    else

        profiles.push(
            profile);

    await write(
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

export async function deleteCurrent() {

    const name =

        el(
            "profileList"
        ).value;

    if (!name)
        return;

    const profiles =

        await read();

    await write(

        profiles.filter(

            x =>

                x.name !== name

        )

    );

    await refreshProfiles();

    alert(
        "삭제 완료"
    );
}