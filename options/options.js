import {

    refreshProfiles,
    loadSelected,
    saveProfile,
    deleteCurrent

}

    from

    "./profileManager.js";

await refreshProfiles();

document
    .getElementById(
        "profileList"
    )
    .addEventListener(

        "change",

        loadSelected

    );

document
    .getElementById(
        "save"
    )
    .addEventListener(

        "click",

        saveProfile

    );

document
    .getElementById(
        "delete"
    )
    .addEventListener(

        "click",

        deleteCurrent

    );