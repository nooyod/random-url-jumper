function randomString(length) {

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

function randomNumber(length) {

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

function generateValue(
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

            >

            0.5

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

export async function jump() {

    const settings =

        await chrome
            .storage
            .local
            .get();

    let value = "";


    // ¸ñ·Ï ±â¹Ý ·£´ý
    if (

        settings.generator

        ===

        "crawl"

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

    // ÀÏ¹Ý ·£´ý
    else {

        value =

            generateValue(

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

    const tabs =

        await chrome
            .tabs
            .query({

                active: true,

                currentWindow: true

            });

    if (
        tabs.length
    ) {

        await chrome
            .tabs
            .update(

                tabs[0].id,

                {

                    url

                }

            );

    }

}