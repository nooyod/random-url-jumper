export function generate(
    length,
    mode
) {

    let chars = "";

    switch (mode) {

        case "number":

            chars =
                "0123456789";

            break;

        case "text":

            chars =
                "abcdefghijklmnopqrstuvwxyz";

            break;

        default:

            chars =
                "abcdefghijklmnopqrstuvwxyz0123456789";

    }

    return [...Array(length)]

        .map(() =>

            chars[
            Math.floor(
                Math.random()
                *
                chars.length
            )
            ]

        )

        .join("");

}