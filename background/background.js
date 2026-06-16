import {
    jump
}
    from "./jumpService.js";

import {
    start,
    stop
}
    from "./scheduler.js";

chrome.runtime.onMessage.addListener(

    async (
        msg
    ) => {

        if (
            msg.action === "jump"
        )
            await jump();

        if (
            msg.action === "start"
        ) {

            const s =

                await chrome
                    .storage
                    .local
                    .get();

            start(
                s.interval
            );

        }

        if (
            msg.action === "stop"
        )
            stop();

    }

);

chrome
    .alarms
    .onAlarm
    .addListener(

        async () => {

            const s =

                await chrome
                    .storage
                    .local
                    .get();

            if (
                !s.running
            )
                return;

            await jump();

        }

    );

chrome
    .commands
    .onCommand
    .addListener(

        async (
            cmd
        ) => {

            if (
                cmd === "jump_now"
            )
                await jump();

        }

    );