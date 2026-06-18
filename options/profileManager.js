function el(id) {
    return document.getElementById(id);
}

async function readProfiles() {

    const data =

        await chrome
            .storage
            .local
            .get(
                "profiles"
            );

    return data.profiles || [];

}

async function writeProfiles(
    profiles
) {

    await chrome
        .storage
        .local
        .set({

            profiles

        });

}


export async function refreshProfiles() {

    const list =

        el(
            "profileList"
        );

    list.innerHTML =

        `
<option value="">
새 프로필
</option>
`;

    const profiles =

        await readProfiles();

    profiles.forEach(

        p => {

            const o =

                document.createElement(
                    "option"
                );

            o.value =
                p.name;

            o.textContent =
                p.name;

            list.appendChild(
                o);

        }

    );

}


export async function loadSelected() {

    const profiles =

        await readProfiles();

    const name =

        el(
            "profileList"
        ).value;

    const p =

        profiles.find(

            x =>

                x.name === name

        );

    if (
        !p
    )
        return;

    Object.entries(
        p
    )

        .forEach(

            ([k, v]) => {

                const node =
                    el(k);

                if (
                    node
                ) {

                    node.value =

                        v ??

                        "";

                }

            }

        );

    if (

        el(
            "status"
        )

    ) {

        el(
            "status"
        )

            .innerHTML =

            `
${p.cachedIds?.length

            ||

            0

            }개 수집됨
<br>
${p.crawledAt

            ||

            "-"

            }
`;

    }

}


export async function saveProfile() {

    const profiles =

        await readProfiles();

    const temp =

        await chrome
            .storage
            .local
            .get(
                "temp"
            );

    const item = {

        name:
            el(
                "profileName"
            ).value,

        baseUrl:
            el(
                "baseUrl"
            ).value,

        generator:
            el(
                "generator"
            ).value,

        boardFilter:
            el(
                "boardFilter"
            )?.value


            ||

            "",

        listUrl:
            el(
                "listUrl"
            ).value,

        linkSelector:
            el(
                "linkSelector"
            ).value,

        extractMode:
            el(
                "extractMode"
            ).value,

        paramName:
            el(
                "paramName"
            ).value,

        regex:
            el(
                "regex"
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

            temp.temp?.ids

            ||

            [],

        crawledAt:

            temp.temp?.time

            ||

            "-"

    };

    const idx =

        profiles.findIndex(

            x =>

                x.name === item.name

        );

    if (
        idx >= 0
    )

        profiles[idx] = item;

    else

        profiles.push(
            item);

    await writeProfiles(
        profiles
    );

    await refreshProfiles();

    alert(
        "저장 완료"
    );

}


export async function deleteCurrent() {

    const name =

        el(
            "profileList"
        ).value;

    if (
        !name
    )
        return;

    const profiles =

        await readProfiles();

    await writeProfiles(

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