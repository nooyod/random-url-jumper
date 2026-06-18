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

                value === null

                ||

                value === ""

            ) {

                return null;

            }

            return Number(
                value
            );

        }


        if (
            mode === "regex"
        ) {

            const m =

                url.match(

                    new RegExp(
                        regex)

                );

            if (
                !m
            )
                return null;

            return Number(
                m[1]);

        }


        // path 방식
        const m =

            url.match(

                /\/(\d+)/

            );

        if (
            !m
        )
            return null;

        return Number(
            m[1]);

    }

    catch (
    e
    ) {

        console.log(
            "추출실패",
            url,
            e
        );

        return null;

    }

}



export async function crawlBoard() {

    const listUrl =
        document.getElementById(
            "listUrl"
        ).value;

    const selector =
        document.getElementById(
            "linkSelector"
        ).value;

    const boardFilter =
        document.getElementById(
            "boardFilter"
        ).value;

    const mode =
        document.getElementById(
            "extractMode"
        ).value;

    const param =
        document.getElementById(
            "paramName"
        ).value;

    const regex =
        document.getElementById(
            "regex"
        ).value;


    const response =

        await fetch(
            listUrl
        );

    const html =

        await response.text();


    const dom =

        new DOMParser()

            .parseFromString(

                html,

                "text/html"

            );


    const base =

        new URL(
            listUrl
        );

    const ids = [];


    const links =

        dom.querySelectorAll(
            selector
        );


    console.log(
        "전체 링크:",
        links.length
    );


    links.forEach(

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


            // 게시판 필터
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


            // 0 제거
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


    console.log(
        "추출:",
        ids
    );


    return ids;

}