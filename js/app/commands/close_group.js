import StateService from '/js/state_service.js'
import TabsService from '/js/tabs_service.js'
import Filters from '/js/filters.js'
import TabsGateway from '/js/infra/browser/tabs_gateway.js'
import { matchesActiveFilters } from '/js/shared/filter_state.js'

export default async function closeGroupCommand({
    groupName,
    activeFilters,
    stateService = StateService,
    tabsService = TabsService,
    filters = Filters,
    tabsGateway = TabsGateway,
    onChanged,
} = {}) {
    console.log("Executing closeGroupCommand for group: " + groupName);
    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' };
    }

    const state = await stateService.loadState();
    const tabs = await tabsService.getAllTabs();

    stateService.enrichTabs(tabs, state);

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
            !state.isLocked(urlString) && 
            state.isTabInGroup(urlString, groupName) &&
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
