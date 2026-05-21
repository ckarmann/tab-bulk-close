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
    getTabValue(tabId: number, key: string): Promise<unknown>
    setTabValue(tabId: number, key: string, value: unknown): Promise<void>
}

export interface TabWithTimeValue extends BrowserTab {
    timeValue?: number
}

const _tabStatePolyfill: TabPolyfill = (() => {
    
    if ((browser.sessions as any)?.getTabValue !== undefined) {
        return {
            getTabValue(tabId: number, key: string) {
                return (browser.sessions as any).getTabValue(tabId, key)
            },
            setTabValue(tabId: number, key: string, value: unknown) {
                logger.debug(`setTabValue for tab ${tabId}: ${key} = ${value}`)
                return (browser.sessions as any).setTabValue(tabId, key, value as any)
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

    async function getTabRegistryState(tabId: number): Promise<{ tabKey: string, state: TabState | null}> {
        const tabKey = `tabState-${tabId}`

        if (!(tabKey in registry.current)) {
            logger.debug('In getTabRegistryState, waiting for init to finish')
            await initPromise
        }

        if (tabKey in registry.current) {
            return { tabKey: tabKey, state: registry.current[tabKey] }
        }
        return { tabKey: tabKey, state: null }
    }

    async function getTabValue(tabId: number, key: string): Promise<unknown> {
        const tabState = (await getTabRegistryState(tabId)).state
        if (tabState) {
            return tabState.dict[key]
        }
        return undefined
    }

    async function getTabFromRegistryToWrite(tab: BrowserTab): Promise<TabState> {
        const tabKeyAndState = await getTabRegistryState(tab.id)
        if (tabKeyAndState.state) {
            return tabKeyAndState.state
        }
        logger.debug(`Create new state for ${tab.id}`)
        return setRegistryEntry(tab, tabKeyAndState.tabKey)
    }

    async function setTabValue(tabId: number, key: string, value: unknown): Promise<void> {
        const tabKeyAndState = await getTabRegistryState(tabId)
        let tabState = tabKeyAndState.state
        if (tabState === null) {
            const tab = await browser.tabs.get(tabId)
            if (tab.id == null || tab.url == null) {
                logger.debug(`Error: no tab with id (${tabId})`)
                return
            }
            tabState = setRegistryEntry({ ...tab, id: tab.id, url: tab.url } as BrowserTab, tabKeyAndState.tabKey)
        }
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
            return _tabStatePolyfill.getTabValue(tab.id, "lastUpdatedOrAccessed")
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
