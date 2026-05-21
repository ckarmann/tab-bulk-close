import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('/js/tabs_service.ts')

async function loadTabsServiceWithSessionsApi() {
    vi.resetModules()

    globalThis.browser = {
        sessions: {
            getTabValue: vi.fn(async (tabId, key) => `${key}-${tabId}`),
            setTabValue: vi.fn(async () => undefined),
        },
        tabs: {
            query: vi.fn(async () => [
                { id: 10, title: 'A' },
                { id: 11, title: 'B' },
            ]),
        },
    }

    return (await import('/js/tabs_service.ts')).default
}

async function loadTabsServiceWithoutSessionsApi() {
    vi.resetModules()

    const makeEvent = () => ({
        addListener: vi.fn(),
    })

    globalThis.browser = {
        storage: {
            local: {
                get: vi.fn(async () => ({ TabRegistry: {} })),
                set: vi.fn(async () => undefined),
            },
        },
        tabs: {
            query: vi.fn(async () => []),
            get: vi.fn(async (tabId) => ({ id: tabId, index: 0 })),
            onCreated: makeEvent(),
            onUpdated: makeEvent(),
            onMoved: makeEvent(),
            onDetached: makeEvent(),
            onAttached: makeEvent(),
            onRemoved: makeEvent(),
            onReplaced: makeEvent(),
        },
    }

    return (await import('/js/tabs_service.ts')).default
}

describe('tabs_service (sessions API branch)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads tabs and enriches each tab with timeValue', async () => {
        const tabsService = await loadTabsServiceWithSessionsApi()

        const tabs = await tabsService.getAllTabs()

        expect(browser.tabs.query).toHaveBeenCalledWith({})
        expect(browser.sessions.getTabValue).toHaveBeenNthCalledWith(1, 10, 'lastUpdatedOrAccessed')
        expect(browser.sessions.getTabValue).toHaveBeenNthCalledWith(2, 11, 'lastUpdatedOrAccessed')
        expect(tabs[0].timeValue).toBe('lastUpdatedOrAccessed-10')
        expect(tabs[1].timeValue).toBe('lastUpdatedOrAccessed-11')
    })

    it('delegates getTabValue and setTabValue to browser.sessions', async () => {
        const tabsService = await loadTabsServiceWithSessionsApi()
        const tab = { id: 21 }

        const value = await tabsService.getTabValue(tab.id, 'foo')
        await tabsService.setTabValue(tab.id, 'foo', 123)

        expect(value).toBe('foo-21')
        expect(browser.sessions.getTabValue).toHaveBeenCalledWith(21, 'foo')
        expect(browser.sessions.setTabValue).toHaveBeenCalledWith(21, 'foo', 123)
    })

    it('falls back to registry mode when browser.sessions is unavailable', async () => {
        const tabsService = await loadTabsServiceWithoutSessionsApi()

        const value = await tabsService.getTabValue(99, 'missing')

        expect(value).toBeUndefined()
        expect(browser.storage.local.get).toHaveBeenCalledWith('TabRegistry')
        expect(browser.tabs.query).toHaveBeenCalledWith({})
        expect(browser.tabs.onCreated.addListener).toHaveBeenCalledTimes(1)
        expect(browser.tabs.onUpdated.addListener).toHaveBeenCalledTimes(1)
        expect(browser.tabs.onMoved.addListener).toHaveBeenCalledTimes(1)
        expect(browser.tabs.onDetached.addListener).toHaveBeenCalledTimes(1)
        expect(browser.tabs.onAttached.addListener).toHaveBeenCalledTimes(1)
        expect(browser.tabs.onRemoved.addListener).toHaveBeenCalledTimes(1)
        expect(browser.tabs.onReplaced.addListener).toHaveBeenCalledTimes(1)
    })
})
