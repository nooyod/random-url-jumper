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
        await chrome.tabs.query({

            active: true,

            currentWindow: true

        });

    if (
        !tabs.length
    )
        return;

    runningTab =
        tabs[0].id;

    timer =
        setInterval(

            async () => {

                try {

                    await chrome.tabs.get(
                        runningTab
                    );

                    await callback();

                }

                catch {

                    await stop();

                }

            },

            seconds * 1000

        );

    await chrome
        .storage
        .session
        .set({

            running: true,

            tabId:
                runningTab

        });

}

export async function stop(
    reason = "manual"
) {

    console.log(
        `STOP: ${reason}`
    );

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

export function isRunning() {

    return timer !== null;

}