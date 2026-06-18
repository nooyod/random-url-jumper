function extractId(
    url,
    mode,
    param,
    regex
) {

    try {

        if (
            mode === "param"
        ) {

            const u =
                new URL(
                    url
                );

            const value =

                u.searchParams.get(
                    param
                );

            if (
                !value
            )
                return null;

            return Number(
                value);

        }


        if (
            mode === "regex"
        ) {

            const m =

                url.match(

                    new RegExp(
                        regex)

                );

            return m
                ?
                Number(
                    m[1]
                )
                :
                null;

        }


        const m =

            url.match(

                /\/(\d+)/

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



async function crawlPage(
    pageUrl,
    selector,
    boardFilter,
    mode,
    param,
    regex
) {

    const html =

        await (

            await fetch(
                pageUrl
            )

        )

            .text();


    const dom =

        new DOMParser()

            .parseFromString(

                html,

                "text/html"

            );


    const base =

        new URL(
            pageUrl
        );

    const ids = [];


    dom

        .querySelectorAll(
            selector
        )

        .forEach(

            node => {

                const raw =

                    node.getAttribute(
                        "href"
                    );

                if (
                    !raw)
                    return;


                let href;


                try {

                    href =

                        new URL(

                            raw,

                            base

                        )

                            .toString();

                }

                catch {

                    return;

                }


                if (

                    boardFilter

                    &&

                    !href.includes(
                        boardFilter
                    )

                ) {

                    return;

                }


                const id =

                    extractId(

                        href,

                        mode,

                        param,

                        regex

                    );


                if (

                    Number.isFinite(
                        id
                    )

                    &&

                    id > 0

                    &&

                    !ids.includes(
                        id
                    )

                ) {

                    ids.push(
                        id
                    );

                }

            }

        );


    return ids;

}



export async function crawlBoard() {


    // DOM 읽기
    const listUrl =

        document
            .getElementById(
                "listUrl"
            )
            .value;

    const selector =

        document
            .getElementById(
                "linkSelector"
            )
            .value;

    const boardFilter =

        document
            .getElementById(
                "boardFilter"
            )
            .value;

    const mode =

        document
            .getElementById(
                "extractMode"
            )
            .value;

    const param =

        document
            .getElementById(
                "paramName"
            )
            .value;

    const regex =

        document
            .getElementById(
                "regex"
            )
            .value;

    const pageParam =

        document
            .getElementById(
                "pageParam"
            )
            .value

        ||

        "page";


    const maxPages =

        Number(

            document
                .getElementById(
                    "maxPages"
                )
                .value

            ||

            10

        );


    const result = [];


    for (

        let page = 0;

        page < maxPages;

        page++

    ) {

        const url =

            new URL(
                listUrl
            );


        // 페이지 변경
        url.searchParams.set(

            pageParam,

            page

        );


        console.log(

            "수집:",

            url.toString()

        );


        const ids =

            await crawlPage(

                url.toString(),

                selector,

                boardFilter,

                mode,

                param,

                regex

            );


        console.log(

            page,

            "페이지:",

            ids.length

        );


        if (

            ids.length === 0

        ) {

            break;

        }


        result.push(

            ...ids

        );

    }


    return [

        ...new Set(
            result
        )

    ];

}