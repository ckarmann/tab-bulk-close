import logger from './shared/logger.ts'

logger.debug('Tabs service initialized')

interface BrowserTab {
    id: number
    url: string
    windowId: number
    index: number
    pinned?: boolean
    title?: string
    lastAccessed?: number
    [key: string]: unknown
}

interface TabState {
    tabId: number
    url: string | undefined
    windowId: number | undefined
    lastAccessed: number | undefined
    index: number
    dict: Record<string, unknown>
}

interface TabPolyfill {
    getTabValue(tab: BrowserTab, key: string): Promise<unknown>
    setTabValue(tab: BrowserTab, key: string, value: unknown): Promise<void>
}

export interface TabWithTimeValue extends BrowserTab {
    timeValue?: number
}

const _tabStatePolyfill: TabPolyfill = (() => {
    if ((browser.sessions as any)?.getTabValue !== undefined) {
        return {
            getTabValue(tab: BrowserTab, key: string) {
                return (browser.sessions as any).getTabValue(tab.id!, key)
            },
            setTabValue(tab: BrowserTab, key: string, value: unknown) {
                logger.debug(`setTabValue for tab ${tab.id}: ${key} = ${value}`)
                return (browser.sessions as any).setTabValue(tab.id!, key, value as any)
            }
        }
    }

    logger.debug('Initialize tab registry')

    const registry: {
        current: Record<string, TabState>
        removed: Record<string, TabState>
        previous: Record<string, TabState> | null
    } = {
        current: {},
        removed: {},
        previous: null
    }

    function write(): void {
        browser.storage.local.set({ TabRegistry: registry.current })
        logger.debug('Registry written to storage', JSON.parse(JSON.stringify(registry.current)))
    }

    function setRegistryEntry(tab: BrowserTab, tabKey: string): TabState {
        const tabState: TabState = {
            tabId: tab.id!,
            url: tab.url,
            windowId: tab.windowId,
            lastAccessed: (tab as any).lastAccessed,
            index: tab.index!,
            dict: {}
        }
        registry.current[tabKey] = tabState
        return tabState
    }

    function matchTab(tab: BrowserTab): void {
        const tabKey = `tabState-${tab.id}`
        let matched: TabState | null = null

        if (tabKey in registry.previous!) {
            matched = registry.previous![tabKey]
        } else {
            for (const previousEntry of Object.values(registry.previous!)) {
                if (tab.url === previousEntry.url &&
                    tab.index === previousEntry.index &&
                    (tab as any).lastAccessed === previousEntry.lastAccessed
                ) {
                    matched = previousEntry
                    break
                }
            }
        }

        if (matched !== null) {
            logger.debug(`Matched tabid:${tab.id} to ${matched.tabId}`)
            const tabState = setRegistryEntry(tab, tabKey)
            tabState.dict = matched.dict
        } else {
            logger.debug(`Unmatched tabid:${tab.id}`)
        }
    }

    const initPromise = browser.storage.local.get("TabRegistry")
        .then(items => {
            registry.previous = (items as any).TabRegistry || {}
            logger.debug('Previous session registry retrieved from storage', JSON.parse(JSON.stringify(registry.previous)))
            return browser.tabs.query({})
                .then(tabs => {
                    logger.debug('Start matching tabs')
                    for (const tab of tabs) {
                        matchTab(tab as unknown as BrowserTab)
                    }
                    logger.debug('Finished matching tabs')
                })
        })

    async function getTabValue(tab: BrowserTab, key: string): Promise<unknown> {
        const tabKey = `tabState-${tab.id}`

        if (!(tabKey in registry.current)) {
            logger.debug('In getTabValue, waiting for init to finish')
            await initPromise
        }

        if (tabKey in registry.current) {
            return registry.current[tabKey].dict[key]
        }
        return undefined
    }

    async function getTabFromRegistryToWrite(tab: BrowserTab): Promise<TabState> {
        const tabKey = `tabState-${tab.id}`

        if (!(tabKey in registry.current)) {
            logger.debug('In getTabFromRegistryToWrite, waiting for init to finish')
            await initPromise
        }

        if (tabKey in registry.current) {
            logger.debug(`Pick old state for ${tab.id}`)
            return registry.current[tabKey]
        }
        logger.debug(`Create new state for ${tab.id}`)
        return setRegistryEntry(tab, tabKey)
    }

    async function setTabValue(tab: BrowserTab, key: string, value: unknown): Promise<void> {
        const tabState = await getTabFromRegistryToWrite(tab)
        tabState.dict[key] = value
        write()
    }

    function onCreated(tab: any): void {
        logger.debug(`onCreated for ${tab.id}`)
        updateTabAsync(tab)
    }

    async function updateTabAsync(tab: BrowserTab): Promise<void> {
        const tabState = await getTabFromRegistryToWrite(tab)
        if (tabState.url !== tab.url ||
            tabState.lastAccessed !== (tab as any).lastAccessed ||
            tabState.index !== tab.index
        ) {
            tabState.url = tab.url
            tabState.lastAccessed = (tab as any).lastAccessed
            tabState.index = tab.index!
            write()
        }
    }

    function onUpdatedOrLoad(_tabId: number, _info: unknown, tab: any): void {
        logger.debug(`onUpdatedOrLoad for ${_tabId}`)
        logger.debug('Tab updated', tab)
        updateTabAsync(tab)
    }

    function updateTabIndexes(): void {
        logger.debug('updateTabIndexes')
        for (const tabState of Object.values(registry.current)) {
            browser.tabs.get(tabState.tabId)
                .then(tab => {
                    if (tab.index !== tabState.index) {
                        tabState.index = tab.index!
                        write()
                    }
                })
        }
        write()
    }

    function onRemoved(tabId: number): void {
        logger.debug(`onRemoved for ${tabId}`)
    }

    function onReplaced(tabId: number): void {
        logger.debug(`onReplaced for ${tabId}`)
    }

    browser.tabs.onCreated.addListener(onCreated as any)
    browser.tabs.onUpdated.addListener(onUpdatedOrLoad as any)
    browser.tabs.onMoved.addListener(updateTabIndexes)
    browser.tabs.onDetached.addListener(updateTabIndexes)
    browser.tabs.onAttached.addListener(updateTabIndexes)
    browser.tabs.onRemoved.addListener(onRemoved)
    if ((browser.tabs as any).onReplaced) {
        (browser.tabs as any).onReplaced.addListener(onReplaced)
    }

    return { getTabValue, setTabValue }
})()

export default {
    getAllTabs(): Promise<TabWithTimeValue[]> {
        function getTabTime(tab: BrowserTab): Promise<TabWithTimeValue> {
            return _tabStatePolyfill.getTabValue(tab, "lastUpdatedOrAccessed")
                .then((lastUpdatedOrAccessed) => {
                    const enriched = tab as TabWithTimeValue
                    enriched.timeValue = lastUpdatedOrAccessed as number
                    return enriched
                })
        }

        return browser.tabs.query({}).then(tabs => Promise.all((tabs as unknown as BrowserTab[]).map(getTabTime)))
    },
    getTabValue: _tabStatePolyfill.getTabValue.bind(_tabStatePolyfill),
    setTabValue: _tabStatePolyfill.setTabValue.bind(_tabStatePolyfill),
}
