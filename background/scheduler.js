let timer = null;

let runningTab = null;

export async function start(
    seconds,
    callback
) {

    await stop(
        "restart"
    );

    const tabs =

        await chrome
            .tabs
            .query({

                active: true,

                currentWindow: true

            });

    if (
        !tabs.length
    )
        return;

    runningTab =
        tabs[0].id;

    await chrome
        .storage
        .session
        .set({

            running: true,

            tabId:
                runningTab

        });

    timer =

        setInterval(

            async () => {

                try {

                    await chrome
                        .tabs
                        .get(
                            runningTab
                        );

                    await callback(
                        runningTab
                    );

                }

                catch {

                    await stop(
                        "tab_closed"
                    );

                }

            },

            seconds * 1000

        );

}

export async function stop(
    reason = "manual"
) {

    if (
        timer !== null
    ) {

        clearInterval(
            timer);

        timer = null;

    }

    runningTab = null;

    await chrome
        .storage
        .session
        .clear();

}

export function getRunningTab() {

    return runningTab;

}

export function isRunning() {

    return timer !== null;

}