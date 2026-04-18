import { notifyStateChanged } from './shared/background_notify.ts'
import routeMessage from './app/message_router.ts'
import logger from './shared/logger.ts'

logger.debug('Background runtime started')

async function markTabAccessTime(tab: { id?: number }): Promise<void> {
    await (browser.sessions as any).setTabValue(tab.id!, "lastUpdatedOrAccessed", Date.now())
}

let lastFocusedWindow = -1
const TABS_PAGE_PATH = 'tabs.html'

function openTab(): void {
    const page_url = browser.runtime.getURL(TABS_PAGE_PATH as any)
    browser.tabs.query({ url: page_url }).then((tabs) => {
        if (tabs.length > 0) {
            const tab = tabs[0]
            browser.windows.update(tab.windowId!, { focused: true })
            browser.tabs.update(tab.id!, { active: true })
        } else {
            browser.tabs.create({ url: TABS_PAGE_PATH })
        }
    })
}

browser.action.onClicked.addListener(openTab)

browser.runtime.onMessage.addListener((message: any) => {
    const messageType = message?.type

    if (typeof messageType !== 'string') {
        return undefined
    }
    if (!messageType.startsWith('command:') && !messageType.startsWith('query:')) {
        return undefined
    }

    return routeMessage(message)
})

browser.tabs.onCreated.addListener((tab) => {
    logger.debug(`Tab created: ${tab.id}`)
    notifyStateChanged('tab_created', { changedTabIds: [tab.id!] })
})

browser.tabs.onRemoved.addListener((tabId, _removeInfo) => {
    notifyStateChanged('tab_removed', { changedTabIds: [tabId] })
})

browser.tabs.onActivated.addListener(async (activeInfo) => {
    logger.debug('Tab activated', activeInfo)
    try {
        const tabId = activeInfo.tabId
        const tab = await browser.tabs.get(tabId)
        await markTabAccessTime(tab)
        await notifyStateChanged('tab_activated', { changedTabIds: [tabId] })
    } catch (error) {
        console.error('Failed to handle tabs.onActivated:', error)
    }
})

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    logger.debug(`Tab updated: ${tabId}`, changeInfo, { active: tab.active })
    try {
        if ("title" in changeInfo) {
            await notifyStateChanged('tab_updated_title', { changedTabIds: [tabId], title: changeInfo.title })
        }

        const shouldRefreshActiveTab = Boolean(tab?.active) && (
            "url" in changeInfo ||
            ("status" in changeInfo && changeInfo.status === "complete")
        )

        if (shouldRefreshActiveTab) {
            const currentTab = await browser.tabs.get(tabId)
            await markTabAccessTime(currentTab)
            await notifyStateChanged('tab_updated', { changedTabIds: [tabId] })
        }
    } catch (error) {
        console.error('Failed to handle tabs.onUpdated:', error)
    }
})

browser.windows.onFocusChanged.addListener(async (windowId) => {
    logger.debug(`Window focus changed to ${windowId}. Previous: ${lastFocusedWindow}`)
    try {
        if (windowId !== -1 && lastFocusedWindow !== windowId) {
            const tabs = await browser.tabs.query({
                windowId,
                active: true,
            })

            if (tabs.length === 0) {
                logger.debug(`No active tabs in window ${windowId}`)
            } else {
                lastFocusedWindow = windowId
                await markTabAccessTime(tabs[0])
                await notifyStateChanged('tab_activated', { changedTabIds: [tabs[0].id!] })
            }
        }
    } catch (error) {
        console.error('Failed to handle windows.onFocusChanged:', error)
    }
})

export { notifyStateChanged }
