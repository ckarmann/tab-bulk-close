export default {
    get(windowId: number, getInfo?: Record<string, unknown>) {
        return browser.windows.get(windowId, getInfo)
    },

    create(createData?: Record<string, unknown>) {
        return browser.windows.create(createData)
    },

    update(windowId: number, updateInfo: Record<string, unknown>) {
        return browser.windows.update(windowId, updateInfo)
    },
}