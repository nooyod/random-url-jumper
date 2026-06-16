import {

    loadProfiles,
    applyProfile

}

    from

    "./profileSelector.js";

await loadProfiles();

profile.onchange =

    applyProfile;

start.onclick =

    () => {

        applyProfile();

        chrome
            .runtime
            .sendMessage({

                action:
                    "start"

            });

    };

document
    .getElementById(
        "stop"
    )
    .addEventListener(

        "click",

        async () => {

            console.log(
                "STOP CLICK"
            );

            await chrome
                .runtime
                .sendMessage({

                    action:
                        "stop"

                });

        }

    );

jump.onclick =

    () => {

        applyProfile();

        chrome
            .runtime
            .sendMessage({

                action:
                    "jump"

            });

    };

settings.onclick =

    () => {

        chrome
            .runtime
            .openOptionsPage();

    };