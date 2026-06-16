import {
    saveSettings
}
    from "./settings.js";

export function initialize() {

    save.onclick =
        saveSettings;

    start.onclick =
        () =>

            chrome
                .runtime
                .sendMessage({

                    action:
                        "start"

                });

    stop.onclick =
        () =>

            chrome
                .runtime
                .sendMessage({

                    action:
                        "stop"

                });

    jump.onclick =
        () =>

            chrome
                .runtime
                .sendMessage({

                    action:
                        "jump"

                });

}