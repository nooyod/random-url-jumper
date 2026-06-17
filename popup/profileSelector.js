export async function loadProfiles() {

    const select =

        document
            .getElementById(
                "profile"
            );

    select.innerHTML = "";

    const data =

        await chrome
            .storage
            .local
            .get(
                "profiles"
            );

    const profiles =

        data.profiles
        ||
        [];

    profiles.forEach(

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

            select.appendChild(
                o);

        }

    );

}

export async function applyProfile() {

    const name =

        document
            .getElementById(
                "profile"
            )
            .value;

    const data =

        await chrome
            .storage
            .local
            .get(
                "profiles"
            );

    const profile =

        data
            .profiles
            ?.find(

                x =>

                    x.name === name

            );

    if (
        !profile
    )
        return;

    await chrome
        .storage
        .local
        .set({

            baseUrl:
                profile.baseUrl,

            mode:
                profile.mode,

            length:
                profile.length,

            interval:
                profile.interval,

            suffix:
                profile.suffix

        });

}