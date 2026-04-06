import stateRepository from '/js/infra/repositories/state_repository.js'
import TabsService from '/js/tabs_service.js'
import TabsGateway from '/js/infra/browser/tabs_gateway.js'
import WindowsGateway from '/js/infra/browser/windows_gateway.js'
import { applyGrouping } from '/js/domain/tab_grouping.js'

// Command to extract all tabs of a group into a new window
export default async function extractGroupCommand({
    group,
    stateRepository: repository = stateRepository,
    tabsService = TabsService,
    windowsGateway = WindowsGateway,
    tabsGateway = TabsGateway,
    onChanged,
} = {}) {
    if (!group) {
        return { ok: false, reason: 'empty-group' };
    }

    const stateData = await repository.loadState();
    const tabs = await tabsService.getAllTabs();

    const [_, groupMap, domainMap] = applyGrouping(tabs, stateData.groups, stateData.mapping);
    const domains = groupMap[group];

    if (!domains || domains.length === 0) {
        return { ok: false, reason: 'group-has-no-domains' };
    }

    const tabIds = [];
    const windowIds = new Set();
    for (let domain of domains) {
        for (let tab of domainMap[domain]) {
            tabIds.push(tab.id);
            windowIds.add(tab.windowId);
        }
    }

    // Check if already in single window
    if (windowIds.size === 1) {
        const [windowId] = Array.from(windowIds);
        const windowInfo = await windowsGateway.get(windowId, { populate: true });
        
        if (windowInfo.tabs.length === tabIds.length) {
            // All tabs in window are from this group; just focus it
            await windowsGateway.update(windowId, { focused: true });
            await tabsGateway.update(tabIds[0], { active: true });
            return { ok: true, group, moved: false, reason: 'already-in-single-window' };
        }
    }

    // Create new window and move tabs
    const windowInfo = await windowsGateway.create({
        focused: true,
        tabId: tabIds[0],
    });
    
    await tabsGateway.move(tabIds, {
        windowId: windowInfo.id,
        index: -1,
    });

    if (typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: true, group, moved: true, windowId: windowInfo.id, tabCount: tabIds.length };
}
