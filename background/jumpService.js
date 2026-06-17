function randomString(
    length
) {

    const chars =

        "abcdefghijklmnopqrstuvwxyz";

    let result = "";

    for (
        let i = 0;
        i < length;
        i++
    ) {

        result +=

            chars[
            Math.floor(
                Math.random()

                *

                chars.length
            )

            ];

    }

    return result;

}

function randomNumber(
    length
) {

    let result = "";

    for (
        let i = 0;
        i < length;
        i++
    ) {

        result +=

            Math.floor(

                Math.random()

                * 10

            );

    }

    return result;

}

function generateRandom(
    mode,
    length
) {

    if (
        mode === "text"
    )

        return randomString(
            length
        );

    if (
        mode === "mix"
    ) {

        return

        Math.random()

            > 0.5

            ?

            randomString(
                length
            )

            :

            randomNumber(
                length
            );

    }

    return randomNumber(
        length);

}

export async function jump(
    tabId
) {

    const settings =

        await chrome
            .storage
            .local
            .get();

    let value;


    // 목록 기반
    if (

        settings.generator === "crawl"

        &&

        settings.cachedIds

            ?.length

    ) {

        value =

            String(

                settings.cachedIds[

                Math.floor(

                    Math.random()

                    *

                    settings.cachedIds.length

                )

                ]

            );

    }

    // 랜덤
    else {

        value =

            generateRandom(

                settings.mode,

                settings.length

            );

    }

    const url =

        settings.baseUrl +

        value +

        (

            settings.suffix

            ||

            ""

        );

    try {

        await chrome
            .tabs
            .update(

                tabId,

                {

                    url

                }

            );

    }

    catch (

    e

    ) {

        console.log(
            e
        );

    }

}