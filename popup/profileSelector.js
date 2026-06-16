export async function loadProfiles() {

    const data =

        await chrome
            .storage
            .local
            .get(
                "profiles"
            );

    const list =

        document
            .getElementById(
                "profile"
            );

    list.innerHTML = "";

    (data.profiles || [])

        .forEach(

            p => {

                const o =

                    document
                        .createElement(
                            "option"
                        );

                o.value =
                    p.name;

                o.text =
                    p.name;

                list.appendChild(
                    o);

            }

        );

}

export async function applyProfile() {

    const selected =

        profile.value;

    const data =

        await chrome
            .storage
            .local
            .get(
                "profiles"
            );

    const target =

        data.profiles.find(

            x =>

                x.name === selected

        );

    await chrome
        .storage
        .local
        .set({

            baseUrl:
                target.baseUrl,

            mode:
                target.mode,

            length:
                target.length,

            interval:
                target.interval,

            suffix:
                target.suffix

        });

}