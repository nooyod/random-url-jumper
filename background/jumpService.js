import {
    load
}
    from "../core/storage.js";

import {
    generate
}
    from "../core/randomGenerator.js";

import {
    build
}
    from "../core/urlBuilder.js";

import {
    move
}
    from "./navigator.js";

export async function jump() {

    const s =

        await load();

    const value =

        generate(

            s.length || 4,

            s.mode || "number"

        );

    const url =

        build(

            s.baseUrl,

            value,

            s.suffix

        );

    await move(
        url
    );

}