import {

    refreshProfiles,
    loadSelected,
    saveProfile,
    deleteCurrent

}

    from

    "./profileManager.js";

import {

    crawlBoard

}

    from

    "../core/boardCrawler.js";

await refreshProfiles();

document
    .getElementById(
        "profileList"
    )
    .onchange =

    loadSelected;

document
    .getElementById(
        "save"
    )
    .onclick =

    saveProfile;

document
    .getElementById(
        "delete"
    )
    .onclick =

    deleteCurrent;

document
    .getElementById(
        "refreshIds"
    )
    .onclick =

    async () => {

        const ids =

            await crawlBoard();

        await chrome
            .storage
            .local
            .set({

                tempIds:
                    ids

            });

        document
            .getElementById(
                "count"
            )

            .textContent =

            `${ids.length}개 수집됨`;

    };