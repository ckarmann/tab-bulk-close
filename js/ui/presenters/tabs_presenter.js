import StateService from '/js/state_service.js'

// from https://sashamaps.net/docs/resources/20-colors/
// (Accessibility:99%)
// Stable color assignment for window badges across rerenders.
const colorList = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#42d4f4', '#f032e6', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#000075', '#a9a9a9', '#ffffff', '#000000']
let nextColor = 0;
const windowIdColorMap = new Map();

function attributeWindowColor(windowId) {
    if (windowIdColorMap.has(windowId)) {
        return windowIdColorMap.get(windowId);
    }

    const newColor = colorList[nextColor];
    nextColor = (nextColor + 1) % colorList.length;
    windowIdColorMap.set(windowId, newColor);
    return newColor;
}

export default function buildTabsViewModel(tabs, state, activeFilters = {}) {
    StateService.enrichTabs(tabs, state, activeFilters);

    const [groups, groupMap, domainMap] = state.applyGrouping(tabs);
    const groupObjectList = [];
    const windowIdMap = new Map();

    for (let group of groups) {
        const domains = groupMap[group] === undefined ? [] : Object.values(groupMap[group]);
        let tabCount = 0;
        let closableCount = 0;
        const domainObjects = [];

        for (let domain of domains) {
            const domainObject = {
                domain,
                filteredCount: 0,
            };
            domainObjects.push(domainObject);

            const domainTabs = domainMap[domain];
            for (let tab of domainTabs) {
                tabCount++;
                if (tab.filtered) {
                    domainObject.filteredCount++;
                    if (!(tab.pinned || state.isLocked(tab.url))) {
                        closableCount++;
                    }
                }

                const windowId = tab.windowId;
                const windowColor = attributeWindowColor(windowId);
                tab.windowColor = windowColor;

                if (!windowIdMap.has(windowId)) {
                    windowIdMap.set(windowId, {
                        id: windowId,
                        windowColor,
                        tabCount: 1,
                    });
                } else {
                    windowIdMap.get(windowId).tabCount += 1;
                }
            }
        }

        groupObjectList.push({
            name: group,
            id: group,
            info: closableCount + '/' + tabCount,
            isOthers: group == 'Others',
            subgroups: domainObjects.filter((domain) => domain.filteredCount > 0).map((domain) => {
                return {
                    name: domain.domain,
                    id: domain.domain,
                    items: Object.values(domainMap[domain.domain]).filter((tab) => tab.filtered).sort((a, b) => a.url.localeCompare(b.url)),
                };
            }),
        });
    }

    const sortedWinMap = new Map([...windowIdMap.entries()].sort());
    return {
        groups: groupObjectList,
        windows: Array.from(sortedWinMap.values()),
    };
}