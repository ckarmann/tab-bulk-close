import logger from './shared/logger.ts'
import type { TabTimestampsModel } from './shared/contracts.ts'
import tabValueStore from './infra/repositories/tab_value_store.ts'

logger.debug('Tabs service initialized')

interface TabListItem {
    id: number
    url: string
    windowId: number
    index: number
    pinned?: boolean
    title?: string
    lastAccessed?: number
    [key: string]: unknown
}

interface TabPolyfill {
    getTabValue(tabId: number, key: string): Promise<unknown>
    setTabValue(tabId: number, key: string, value: unknown): Promise<void>
}

export interface TabWithTimeValue extends TabListItem {
    timeValue?: number
}

function isTabTimestampsModel(value: unknown): value is TabTimestampsModel {
    if (!value || typeof value !== 'object') {
        return false
    }

    const candidate = value as Partial<TabTimestampsModel>
    return (
        typeof candidate.lastSeenAt === 'number' &&
        typeof candidate.lastContentChangeAt === 'number' &&
        typeof candidate.lastUsedAt === 'number' &&
        typeof candidate.lastUsedReason === 'string' &&
        typeof candidate.lastEventAt === 'number'
    )
}

const _tabStatePolyfill: TabPolyfill = tabValueStore as unknown as TabPolyfill

export default {
    getAllTabs(): Promise<TabWithTimeValue[]> {
        function getTabTime(tab: TabListItem): Promise<TabWithTimeValue> {
            return _tabStatePolyfill.getTabValue(tab.id, 'timestamps')
                .then((timestamps) => {
                    const enriched = tab as TabWithTimeValue
                    if (isTabTimestampsModel(timestamps)) {
                        enriched.timeValue = timestamps.lastUsedAt
                    }
                    return enriched
                })
        }

        return browser.tabs.query({}).then(tabs => Promise.all((tabs as unknown as TabListItem[]).map(getTabTime)))
    },
    getTabValue: _tabStatePolyfill.getTabValue.bind(_tabStatePolyfill),
    setTabValue: _tabStatePolyfill.setTabValue.bind(_tabStatePolyfill),
}
