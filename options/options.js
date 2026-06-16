import {

    loadProfiles,
    saveProfiles

}

    from

    "./profileManager.js";

async function refresh() {

    const list =

        document
            .getElementById(
                "profileList"
            );

    list.innerHTML = "";

    const profiles =

        await loadProfiles();

    profiles.forEach(

        (p, i) => {

            const o =

                document
                    .createElement(
                        "option"
                    );

            o.value = i;

            o.text = p.name;

            list.appendChild(
                o
            );

        }

    );

}

document
    .getElementById(
        "saveAs"
    )

    .onclick =

    async () => {

        const name =

            prompt(
                "프로필명"
            );

        if (
            !name
        )
            return;

        const profiles =

            await loadProfiles();

        profiles.push({

            name,

            baseUrl:
                baseUrl.value,

            mode:
                mode.value,

            length:
                length.value,

            interval:
                interval.value,

            suffix:
                suffix.value

        });

        await saveProfiles(
            profiles
        );

        refresh();

    };

refresh();