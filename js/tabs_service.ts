console.log("Tabs service start")

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

interface EnrichedTab extends BrowserTab {
    timeValue?: unknown
}

const _tabStatePolyfill: TabPolyfill = (() => {
    const log = true

    if ((browser.sessions as any)?.getTabValue !== undefined) {
        return {
            getTabValue(tab: BrowserTab, key: string) {
                return (browser.sessions as any).getTabValue(tab.id!, key)
            },
            setTabValue(tab: BrowserTab, key: string, value: unknown) {
                if (log) console.log(`setTabValue for tab ${tab.id}: ${key} = ${value}`)
                return (browser.sessions as any).setTabValue(tab.id!, key, value as any)
            }
        }
    }

    if (log) console.log("Initialize tab registry.")

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
        if (log) console.info('Registry written to storage.', JSON.parse(JSON.stringify(registry.current)))
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
            if (log) console.info(`Matched tabid:${tab.id} to ${matched.tabId}`)
            const tabState = setRegistryEntry(tab, tabKey)
            tabState.dict = matched.dict
        } else {
            if (log) console.warn(`Unmatched tabid:${tab.id}`)
        }
    }

    const initPromise = browser.storage.local.get("TabRegistry")
        .then(items => {
            registry.previous = (items as any).TabRegistry || {}
            if (log) console.info("Previous sessions's registry retrieved from storage. ", JSON.parse(JSON.stringify(registry.previous)))
            return browser.tabs.query({})
                .then(tabs => {
                    if (log) console.info("Start matching tabs")
                    for (const tab of tabs) {
                        matchTab(tab as unknown as BrowserTab)
                    }
                    if (log) console.info("Finished matching tabs")
                })
        })

    async function getTabValue(tab: BrowserTab, key: string): Promise<unknown> {
        const tabKey = `tabState-${tab.id}`

        if (!(tabKey in registry.current)) {
            if (log) console.log("In Get, Wait for init to finish.")
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
            if (log) console.log("In getTabFromRegistryToWrite, Wait for init to finish.")
            await initPromise
        }

        if (tabKey in registry.current) {
            if (log) console.log(`Pick old state for ${tab.id}`)
            return registry.current[tabKey]
        }
        if (log) console.log(`Create new state for ${tab.id}`)
        return setRegistryEntry(tab, tabKey)
    }

    async function setTabValue(tab: BrowserTab, key: string, value: unknown): Promise<void> {
        const tabState = await getTabFromRegistryToWrite(tab)
        tabState.dict[key] = value
        write()
    }

    function onCreated(tab: any): void {
        if (log) console.log(`XX - In onCreated for ${tab.id}`)
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
        if (log) console.log(`XX - In onUpdatedOrLoad for ${_tabId}`)
        if (log) console.info('Tab updated', tab)
        updateTabAsync(tab)
    }

    function updateTabIndexes(): void {
        if (log) console.log("XX - In updateTabIndexes")
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
        if (log) console.log(`XX - In onRemoved for ${tabId}`)
    }

    function onReplaced(tabId: number): void {
        if (log) console.log(`XX - In onReplaced for ${tabId}`)
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
    getAllTabs(): Promise<EnrichedTab[]> {
        function getTabTime(tab: BrowserTab): Promise<EnrichedTab> {
            return _tabStatePolyfill.getTabValue(tab, "lastUpdatedOrAccessed")
                .then((lastUpdatedOrAccessed) => {
                    const enriched = tab as EnrichedTab
                    enriched.timeValue = lastUpdatedOrAccessed
                    return enriched
                })
        }

        return browser.tabs.query({}).then(tabs => Promise.all((tabs as unknown as BrowserTab[]).map(getTabTime)))
    },
    getTabValue: _tabStatePolyfill.getTabValue.bind(_tabStatePolyfill),
    setTabValue: _tabStatePolyfill.setTabValue.bind(_tabStatePolyfill),
}
