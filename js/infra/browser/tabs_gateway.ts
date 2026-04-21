export default {
    get(tabId: number) {
        return browser.tabs.get(tabId)
    },

    query(queryInfo: Record<string, unknown>) {
        return browser.tabs.query(queryInfo)
    },

    update(tabId: number, updateProperties: Record<string, unknown>) {
        return browser.tabs.update(tabId, updateProperties)
    },

    remove(tabIds: number | number[]) {
        return browser.tabs.remove(tabIds as any)
    },

    move(tabIds: number | number[], moveProperties: any) {
        return browser.tabs.move(tabIds as any, moveProperties)
    },
}