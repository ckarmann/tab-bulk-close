export default {
    get(tabId) {
        return browser.tabs.get(tabId);
    },

    query(queryInfo) {
        return browser.tabs.query(queryInfo);
    },

    update(tabId, updateProperties) {
        return browser.tabs.update(tabId, updateProperties);
    },

    remove(tabIds) {
        return browser.tabs.remove(tabIds);
    },

    move(tabIds, moveProperties) {
        return browser.tabs.move(tabIds, moveProperties);
    },
}
