import { notifyStateChanged } from './shared/background_notify.ts'
import routeMessage from './app/message_router.ts'
import logger from './shared/logger.ts'
import tabs_service from './tabs_service.ts'
import { computeLastUsedAt, makeTimestamps } from './shared/tab_timestamps.ts'
import type { TabTimestampsModel, UsageReason } from './shared/contracts.ts'

logger.debug('Background runtime started')

const UPDATE_COALESCE_WINDOW_MS = 750

function getUpdateReasonPriority(reason: UsageReason): number {
    switch (reason) {
        case 'url_changed':
            return 6
        case 'activated':
            return 5
        case 'focus_changed':
            return 4
        case 'created':
            return 3
        case 'load_complete':
            return 2
        case 'fallback_lastAccessed':
            return 1
        default:
            return 0
    }
}


async function touchTab(tabId: number, reason: UsageReason, isActive: boolean = false): Promise<void> {
    logger.debug(`Touching tab ${tabId} due to ${reason}`)

    let tabTimestamps = await tabs_service.getTabValue(tabId, 'timestamps') as TabTimestampsModel | undefined
    const now = Date.now()

    if (typeof tabTimestamps === 'undefined') {
        logger.debug(`No timestamp for tab ${tabId}, setting current time as initial timestamp`)
        const initTimestamps = makeTimestamps(now, now, reason, now)
        await tabs_service.setTabValue(tabId, 'timestamps', initTimestamps)
        return
    }

    if (now - tabTimestamps.lastEventAt < UPDATE_COALESCE_WINDOW_MS &&
        getUpdateReasonPriority(reason) <= getUpdateReasonPriority(tabTimestamps.lastUsedReason)) {
        logger.debug(`Skipping touchTab for tab ${tabId} due to recent event (${now - tabTimestamps.lastEventAt}ms ago)`)
        return
    }

    const patch: Partial<TabTimestampsModel> = {}
    switch (reason) {
        case 'activated':
        case 'focus_changed':
            patch.lastSeenAt = now
            break
        case 'url_changed':
        case 'load_complete':
            patch.lastContentChangeAt = now
            break
        case 'created':
            if (isActive) {
                patch.lastSeenAt = now
            }
            patch.lastContentChangeAt = now
            break
        default:
            break
    }
    const updated: TabTimestampsModel = {
        ...tabTimestamps,
        ...patch,
        lastUsedReason: reason,
        lastEventAt: now,
    }
    updated.lastUsedAt = computeLastUsedAt(updated.lastSeenAt, updated.lastContentChangeAt)
    await tabs_service.setTabValue(tabId, 'timestamps', updated)
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

browser.tabs.onCreated.addListener(async (tab) => {
    logger.debug(`Tab created: ${tab.id}`)
    await touchTab(tab.id!, 'created', Boolean(tab.active))
    await notifyStateChanged('tab_created', { changedTabIds: [tab.id!] })
})

browser.tabs.onRemoved.addListener((tabId, _removeInfo) => {
    notifyStateChanged('tab_removed', { changedTabIds: [tabId] })
})

browser.tabs.onActivated.addListener(async (activeInfo) => {
    logger.debug('Tab activated', activeInfo)
    try {
        const tabId = activeInfo.tabId
        await touchTab(tabId, 'activated', true)
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

        if (tab.active) {
            if ("url" in changeInfo) {
                await touchTab(tabId, 'url_changed', true)
                await notifyStateChanged('tab_updated', { changedTabIds: [tabId] })
                return
            }

            if ("status" in changeInfo && changeInfo.status === "complete") {
                await touchTab(tabId, 'load_complete', true)
                await notifyStateChanged('tab_updated', { changedTabIds: [tabId] })
                return
            }
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
                await touchTab(tabs[0].id!, 'focus_changed', true)
                await notifyStateChanged('tab_activated', { changedTabIds: [tabs[0].id!] })
            }
        }
    } catch (error) {
        console.error('Failed to handle windows.onFocusChanged:', error)
    }
})

export { notifyStateChanged, touchTab }