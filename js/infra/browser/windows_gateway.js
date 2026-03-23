export default {
    get(windowId, getInfo) {
        return browser.windows.get(windowId, getInfo);
    },

    create(createData) {
        return browser.windows.create(createData);
    },

    update(windowId, updateInfo) {
        return browser.windows.update(windowId, updateInfo);
    },
}
