import stateRepository from '../../infra/repositories/state_repository'
import TabsService from '../../tabs_service.ts'
import Filters from '../../filters.ts'
import TabsGateway from '../../infra/browser/tabs_gateway'
import { matchesActiveFilters } from '../../shared/filter_state'
import { enrichTabs } from '../../domain/tab_enrichment'
import { isTabInGroup } from '../../domain/tab_grouping'
import type { ActiveFilters } from '../../shared/contracts'
import type { TabWithTimeValue } from '../../tabs_service'

interface CloseGroupInput {
    groupName?: string
    activeFilters?: ActiveFilters
    stateRepository?: {
        loadState: () => Promise<{ lockedUrls: string[]; mapping: Record<string, string> }>
    }
    tabsService?: { getAllTabs: () => Promise<TabWithTimeValue[]> }
    filters?: { state?: ActiveFilters; filter?: (tab: Record<string, unknown>) => boolean }
    tabsGateway?: { remove: (tabId: number) => Promise<unknown> }
    onChanged?: () => void
}

export default async function closeGroupCommand({
    groupName,
    activeFilters,
    stateRepository: repository = stateRepository,
    tabsService = TabsService,
    filters = Filters,
    tabsGateway = TabsGateway,
    onChanged,
}: CloseGroupInput = {}) {
    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' }
    }

    const stateData = await repository.loadState()
    const tabs = await tabsService.getAllTabs()

    enrichTabs(tabs, (url) => stateData.lockedUrls.includes(url))

    const filterState = activeFilters !== undefined ? activeFilters : (filters?.state || {})

    let closedCount = 0
    for (const tab of tabs) {
        const urlString = tab.url

        const matchesFilter = activeFilters === undefined && typeof filters?.filter === 'function'
            ? filters.filter(tab)
            : matchesActiveFilters(tab, filterState)

        if (
            !tab.pinned
            && !stateData.lockedUrls.includes(urlString)
            && isTabInGroup(urlString, groupName, stateData.mapping)
            && matchesFilter
        ) {
            await tabsGateway.remove(tab.id)
            closedCount++
        }
    }

    if (closedCount > 0 && typeof onChanged === 'function') {
        onChanged()
    }

    return { ok: true, groupName, closedCount }
}