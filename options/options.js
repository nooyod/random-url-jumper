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

        const status =

            document
                .getElementById(
                    "status"
                );

        try {

            status.innerHTML =

                "수집 중...";

            const ids =

                await crawlBoard();

            const time =

                new Date()

                    .toLocaleString();

            await chrome
                .storage
                .local
                .set({

                    temp: {

                        ids,

                        time

                    }

                });

            status.innerHTML =

                `
${ids.length}개 수집됨
<br>
${time}
`;

            console.log(
                ids
            );

        }

        catch (

        e

        ) {

            console.error(
                e
            );

            status.innerHTML =

                "수집 실패";

        }

    };


generator.onchange =

    () => {

        crawlArea.style.display =

            generator.value

                ===

                "crawl"

                ?

                "block"

                :

                "none";

    };

generator.dispatchEvent(

    new Event(
        "change"
    )

);