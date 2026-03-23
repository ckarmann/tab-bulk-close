import StateService from '/js/state_service.js'
import TabsService from '/js/tabs_service.js'

// Command to extract all tabs of a group into a new window
export default async function extractGroupCommand({
    group,
    stateService = StateService,
    tabsService = TabsService,
    windowsGateway = { 
        get: (windowId, options) => browser.windows.get(windowId, options),
        create: (createData) => browser.windows.create(createData),
        update: (windowId, updateData) => browser.windows.update(windowId, updateData),
    },
    tabsGateway = {
        get: (tabId) => browser.tabs.get(tabId),
        update: (tabId, updateData) => browser.tabs.update(tabId, updateData),
        move: (tabIds, moveData) => browser.tabs.move(tabIds, moveData),
    },
    onChanged,
} = {}) {
    if (!group) {
        return { ok: false, reason: 'empty-group' };
    }

    const state = await stateService.loadState();
    const tabs = await tabsService.getAllTabs();

    const [_, groupMap, domainMap] = state.applyGrouping(tabs);
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
