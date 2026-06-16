import {

    jump

}

    from "./jumpService.js";

import {

    start,
    stop

}

    from "./scheduler.js";

chrome
    .runtime
    .onMessage
    .addListener(

        async (

            msg

        ) => {

            if (
                msg.action === "jump"
            ) {

                await jump();

            }

            if (
                msg.action === "start"
            ) {

                const s =

                    await chrome
                        .storage
                        .local
                        .get();

                await start(

                    s.interval || 10,

                    jump

                );

            }

            if (
                msg.action === "stop"
            ) {

                console.log(
                    "STOP RECEIVED"
                );

                await stop(
                    "user"
                );

            }

        }

    );

chrome
    .tabs
    .onRemoved
    .addListener(

        async (

            tabId

        ) => {

            const data =

                await chrome
                    .storage
                    .session
                    .get();

            if (

                data.tabId === tabId

            )

                await stop(
                    "tab_closed"
                );

        }

    );

chrome
    .runtime
    .onStartup
    .addListener(

        async () => {

            await stop();

        }

    );

chrome
    .runtime
    .onSuspend
    .addListener(

        async () => {

            await stop();

        }

    );