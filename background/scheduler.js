export async function start(
    seconds
) {

    await chrome
        .storage
        .local
        .set({
            running: true
        });

    chrome
        .alarms
        .create(
            "auto",
            {
                periodInMinutes:
                    seconds / 60
            }
        );

}

export async function stop() {

    await chrome
        .storage
        .local
        .set({
            running: false
        });

    chrome
        .alarms
        .clear(
            "auto"
        );

}