export async function move(
    url
) {

    const tabs =

        await chrome
            .tabs
            .query({

                active: true,

                currentWindow: true

            });

    if (
        tabs.length
    ) {

        chrome
            .tabs
            .update(

                tabs[0].id,

                {
                    url
                }

            );

    }

}