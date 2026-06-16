export async function save(data) {

    await chrome
        .storage
        .local
        .set(data);

}

export async function load() {

    return await chrome
        .storage
        .local
        .get();

}