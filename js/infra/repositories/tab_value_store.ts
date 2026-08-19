import logger from '../../shared/logger.ts'

interface RegistryTab {
    id: number
    url?: string
    windowId?: number
    index?: number
    lastAccessed?: number
    [key: string]: unknown
}

interface TabState {
    tabId: number
    url: string | undefined
    windowId: number | undefined
    lastAccessed: number | undefined
    index: number | undefined
    dict: Record<string, unknown>
}

interface TabValueStore {
    getTabValue(tabId: number, key: string): Promise<unknown>
    setTabValue(tabId: number, key: string, value: unknown): Promise<void>
    removeTabValue(tabId: number, key: string): Promise<void>
    clearTabValues(tabId: number): Promise<void>
}

const tabValueStore: TabValueStore = (() => {
    const nativeSessionStore = (browser.sessions as {
        getTabValue?: (tabId: number, key: string) => Promise<unknown>
        setTabValue?: (tabId: number, key: string, value: unknown) => Promise<void>
        removeTabValue?: (tabId: number, key: string) => Promise<void>
    })

    if (typeof nativeSessionStore?.getTabValue === 'function' && typeof nativeSessionStore?.setTabValue === 'function') {
        // browser.sessions has no bulk "clear all values for a tab" API, so we track
        // the keys we have written during this runtime to support clearTabValues.
        const knownKeysByTabId: Record<number, Set<string>> = {}

        function trackKey(tabId: number, key: string): void {
            const knownKeys = knownKeysByTabId[tabId] ?? (knownKeysByTabId[tabId] = new Set())
            knownKeys.add(key)
        }

        async function removeTabValue(tabId: number, key: string): Promise<void> {
            if (typeof nativeSessionStore.removeTabValue === 'function') {
                await nativeSessionStore.removeTabValue(tabId, key)
            } else {
                await nativeSessionStore.setTabValue!(tabId, key, undefined)
            }
            knownKeysByTabId[tabId]?.delete(key)
        }

        return {
            async getTabValue(tabId: number, key: string): Promise<unknown> {
                return nativeSessionStore.getTabValue!(tabId, key)
            },
            async setTabValue(tabId: number, key: string, value: unknown): Promise<void> {
                logger.debug(`setTabValue for tab ${tabId}: ${key} = ${value}`)
                await nativeSessionStore.setTabValue!(tabId, key, value)
                trackKey(tabId, key)
            },
            removeTabValue,
            async clearTabValues(tabId: number): Promise<void> {
                const knownKeys = knownKeysByTabId[tabId]
                if (!knownKeys) {
                    return
                }
                await Promise.all(Array.from(knownKeys).map((key) => removeTabValue(tabId, key)))
                delete knownKeysByTabId[tabId]
            },
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
        previous: null,
    }

    function write(): void {
        browser.storage.local.set({ TabRegistry: registry.current })
        logger.debug('Registry written to storage', JSON.parse(JSON.stringify(registry.current)))
    }

    function setRegistryEntry(tab: RegistryTab, tabKey: string): TabState {
        const tabState: TabState = {
            tabId: tab.id,
            url: tab.url,
            windowId: tab.windowId,
            lastAccessed: tab.lastAccessed,
            index: tab.index,
            dict: {},
        }
        registry.current[tabKey] = tabState
        return tabState
    }

    function matchTab(tab: RegistryTab): void {
        const tabKey = `tabState-${tab.id}`
        let matched: TabState | null = null

        if (tabKey in (registry.previous ?? {})) {
            matched = registry.previous![tabKey]
        } else {
            for (const previousEntry of Object.values(registry.previous ?? {})) {
                if (tab.url === previousEntry.url &&
                    tab.index === previousEntry.index &&
                    tab.lastAccessed === previousEntry.lastAccessed
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

    const initPromise = browser.storage.local.get('TabRegistry')
        .then((items) => {
            registry.previous = (items as { TabRegistry?: Record<string, TabState> }).TabRegistry ?? {}
            logger.debug('Previous session registry retrieved from storage', JSON.parse(JSON.stringify(registry.previous)))
            return browser.tabs.query({})
                .then((tabs) => {
                    logger.debug('Start matching tabs')
                    for (const tab of tabs) {
                        matchTab(tab as unknown as RegistryTab)
                    }
                    logger.debug('Finished matching tabs')
                })
        })

    async function getTabRegistryState(tabId: number): Promise<{ tabKey: string, state: TabState | null }> {
        const tabKey = `tabState-${tabId}`

        if (!(tabKey in registry.current)) {
            logger.debug('In getTabRegistryState, waiting for init to finish')
            await initPromise
        }

        if (tabKey in registry.current) {
            return { tabKey, state: registry.current[tabKey] }
        }
        return { tabKey, state: null }
    }

    async function getTabValue(tabId: number, key: string): Promise<unknown> {
        const tabState = (await getTabRegistryState(tabId)).state
        if (tabState) {
            return tabState.dict[key]
        }
        return undefined
    }

    async function getTabFromRegistryToWrite(tab: RegistryTab): Promise<TabState> {
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
            tabState = setRegistryEntry({ ...tab, id: tab.id, url: tab.url }, tabKeyAndState.tabKey)
        }
        tabState.dict[key] = value
        write()
    }

    function onCreated(tab: any): void {
        logger.debug(`onCreated for ${tab.id}`)
        void updateTabAsync(tab)
    }

    async function updateTabAsync(tab: RegistryTab): Promise<void> {
        const tabState = await getTabFromRegistryToWrite(tab)
        if (tabState.url !== tab.url ||
            tabState.lastAccessed !== tab.lastAccessed ||
            tabState.index !== tab.index
        ) {
            tabState.url = tab.url
            tabState.lastAccessed = tab.lastAccessed
            tabState.index = tab.index
            write()
        }
    }

    function onUpdatedOrLoad(_tabId: number, _info: unknown, tab: any): void {
        logger.debug(`onUpdatedOrLoad for ${_tabId}`)
        logger.debug('Tab updated', tab)
        void updateTabAsync(tab)
    }

    function updateTabIndexes(): void {
        logger.debug('updateTabIndexes')
        for (const tabState of Object.values(registry.current)) {
            browser.tabs.get(tabState.tabId)
                .then((tab) => {
                    if (tab.index !== tabState.index) {
                        tabState.index = tab.index
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

    return {
        getTabValue,
        setTabValue,
        async removeTabValue(tabId: number, key: string): Promise<void> {
            const tabState = (await getTabRegistryState(tabId)).state
            if (tabState) {
                delete tabState.dict[key]
                write()
            }
        },
        async clearTabValues(tabId: number): Promise<void> {
            const tabState = (await getTabRegistryState(tabId)).state
            if (tabState) {
                tabState.dict = {}
                write()
            }
        },
    }
})()

export default tabValueStore
export type { TabValueStore }
