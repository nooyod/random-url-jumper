function extractId(
    url,
    mode
) {

    try {

        if (
            mode === "query"
        ) {

            return Number(

                new URL(
                    url
                )

                    .searchParams

                    .get(
                        "id"
                    )

            );

        }

        const m =

            url.match(

                /\/(\d+)\/?$/

            );

        return m
            ?
            Number(
                m[1]
            )
            :
            null;

    }

    catch {

        return null;

    }

}

export async function crawlBoard() {

    const listUrl =

        document
            .getElementById(
                "listUrl"
            )
            .value;

    const extractMode =

        document
            .getElementById(
                "extractMode"
            )
            .value;

    const html =

        await fetch(
            listUrl
        )

            .then(

                r =>

                    r.text()

            );

    const dom =

        new DOMParser()

            .parseFromString(

                html,

                "text/html"

            );

    const ids = [];

    dom

        .querySelectorAll(
            "a"
        )

        .forEach(

            a => {

                const href =

                    a.href;

                const id =

                    extractId(

                        href,

                        extractMode

                    );

                if (
                    id
                )
                    ids.push(
                        id
                    );

            }

        );

    return [

        ...new Set(
            ids
        )

    ];

}