import {

    loadProfiles,
    applyProfile

}

    from

    "./profileSelector.js";

await loadProfiles();

document
    .getElementById(
        "profile"
    )
    .addEventListener(

        "change",

        applyProfile

    );

document
    .getElementById(
        "start"
    )
    .addEventListener(

        "click",

        async () => {

            await applyProfile();

            await chrome
                .runtime
                .sendMessage({

                    action: "start"

                });

        }

    );

document
    .getElementById(
        "stop"
    )
    .addEventListener(

        "click",

        async () => {

            await chrome
                .runtime
                .sendMessage({

                    action: "stop"

                });

        }

    );

document
    .getElementById(
        "jump"
    )
    .addEventListener(

        "click",

        async () => {

            await applyProfile();

            await chrome
                .runtime
                .sendMessage({

                    action: "jump"

                });

        }

    );

document
    .getElementById(
        "settings"
    )
    .addEventListener(

        "click",

        () => {

            chrome
                .runtime
                .openOptionsPage();

        }

    );