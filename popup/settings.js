import {
    save
}
    from "../core/storage.js";

export async function saveSettings() {

    await save({

        baseUrl:
            baseUrl.value,

        mode:
            mode.value,

        length:
            Number(
                length.value
            ),

        interval:
            Number(
                interval.value
            ),

        suffix:
            suffix.value

    });

}