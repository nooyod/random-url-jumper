export async function loadProfiles() {

    return (

        await chrome
            .storage
            .local
            .get(
                "profiles"
            )

    ).profiles

        ||

        [];

}

export async function saveProfiles(

    profiles

) {

    await chrome
        .storage
        .local
        .set({

            profiles

        });

}