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

        if (
            Math.random()
            > 0.5
        ) {

            return randomString(
                length
            );

        }

        return randomNumber(
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

    // 현재 설정과 같은 주소의 프로필 찾기
    const profile =

        settings
            .profiles

            ?.find(

                p =>

                    p.baseUrl ===

                    settings.baseUrl

            )

        ||

        settings
            .profiles

        ?.[0];


    console.log(
        "PROFILE",
        profile
    );

    let value;


    // 목록 기반
    if (

        profile.generator === "crawl"

        &&

        profile.cachedIds

            ?.length

    ) {

        value =

            String(

                profile.cachedIds[

                Math.floor(

                    Math.random()

                    *

                    profile.cachedIds.length

                )

                ]

            );

    }

    // 랜덤
    else {

        value =

            generateRandom(

                profile.mode,

                profile.length

            );

    }

    const url =

        profile.baseUrl +

        value +

        (

            profile.suffix

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