import StateService from '/js/state_service.js'
import TabsService from '/js/tabs_service.js'
import Filters from '/js/filters.js'
import TabsGateway from '/js/infra/browser/tabs_gateway.js'

export default async function closeGroupCommand({
    groupName,
    stateService = StateService,
    tabsService = TabsService,
    filters = Filters,
    tabsGateway = TabsGateway,
    onChanged,
} = {}) {
    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' };
    }

    const state = await stateService.loadState();
    const tabs = await tabsService.getAllTabs();

    stateService.enrichTabs(tabs, state);

    let closedCount = 0;
    for (let tab of tabs) {
        const urlString = tab.url;

        if (!tab.pinned && 
            !state.isLocked(urlString) && 
            state.isTabInGroup(urlString, groupName) &&
            filters.filter(tab)) {
            
            await tabsGateway.remove(tab.id);
            closedCount++;
        }
    }

    if (closedCount > 0 && typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: true, groupName, closedCount };
}
