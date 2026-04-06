import stateRepository from '/js/infra/repositories/state_repository.js'
import TabsService from '/js/tabs_service.js'
import Filters from '/js/filters.js'
import TabsGateway from '/js/infra/browser/tabs_gateway.js'
import { matchesActiveFilters } from '/js/shared/filter_state.js'
import { enrichTabs } from '/js/domain/tab_enrichment.js'
import { isTabInGroup } from '/js/domain/tab_grouping.js'

export default async function closeGroupCommand({
    groupName,
    activeFilters,
    stateRepository: repository = stateRepository,
    tabsService = TabsService,
    filters = Filters,
    tabsGateway = TabsGateway,
    onChanged,
} = {}) {
    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' };
    }

    const stateData = await repository.loadState();
    const tabs = await tabsService.getAllTabs();

    enrichTabs(tabs, url => stateData.lockedUrls.includes(url));

    const filterState = activeFilters !== undefined
        ? activeFilters
        : (filters?.state || {});

    let closedCount = 0;
    for (let tab of tabs) {
        const urlString = tab.url;

        const matchesFilter = activeFilters === undefined && typeof filters?.filter === 'function'
            ? filters.filter(tab)
            : matchesActiveFilters(tab, filterState);

        if (!tab.pinned && 
            !stateData.lockedUrls.includes(urlString) && 
            isTabInGroup(urlString, groupName, stateData.mapping) &&
            matchesFilter) {
            
            await tabsGateway.remove(tab.id);
            closedCount++;
        }
    }

    if (closedCount > 0 && typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: true, groupName, closedCount };
}
