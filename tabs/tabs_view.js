import { handleDragStart, handleDragEnd, handleBoxDragOver, handleBoxDragEnter, handleBoxDragLeave, handleDrop } from './tabs.js';
import TabsService from '/js/tabs_service.js'
import StateService from '/js/state_service.js'

// Mechanism to trigger refreshes of the page, only when there is a change.
var isDirty = true;

export async function refreshNow() {
    console.log("setDirtyAndRefresh");
    setDirtyAndRefresh(0);
}

export async function setDirtyAndRefresh(delayMs) {
    isDirty = true;
    if (delayMs == 0) {
        return await refresh();
    } else {
        return delay(delayMs).then(refresh);
    }
}

function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

async function refresh() {
    if (isDirty) {
        console.warn("--------- refresh");
        const state = await StateService.loadState();
        console.log(state);
        await listTabs(state);
    }
    isDirty = false;
}

// page refresh implementation.
async function listTabs(state) {
    return TabsService.getAllTabs()
        .then((tabs) => {
            refreshDisplay(tabs, state);
        });
}

export function refreshDisplay(tabs, state) {
    StateService.enrichTabs(tabs, state);

    const [groups, groupMap, domainMap] = state.applyGrouping(tabs);

    const groupObjectList = []

    for (let group of groups) {
        const domains = groupMap[group] === undefined ? [] : Object.values(groupMap[group]);
        
        // count tabs and add metadata.
        let tabCount = 0;
        let closableCount = 0;
        const domainObjects = []
        for (let domain of domains) {

            let d = { 
                domain: domain,
                filteredCount: 0,
            };
            domainObjects.push(d);
            const tabs = domainMap[domain];
            for (let tab of tabs) {
                tabCount ++;
                if (tab.filtered) {
                    d.filteredCount ++;
                    if (!(tab.pinned || state.isLocked(tab.url))) {
                        closableCount ++;
                    }
                }
            }
        }

        groupObjectList.push({
            "name": group,
            "id": group,
            "info": closableCount + "/" + tabCount,
            "subgroups" : domainObjects.filter(d => d.filteredCount > 0).map(domain => {
                return {
                    "name": domain.domain,
                    "id": domain.domain,
                    "items": Object.values(domainMap[domain.domain]).filter(tab => tab.filtered).sort((a,b) => a.url.localeCompare(b.url))
                };
            })
        })
    }
    
    // Add the fragment to the page, finally. 
    const groupTemplate = document.getElementById('group-template').innerHTML;
    const shortcutTemplate = document.getElementById('group-shortcut-template').innerHTML;
    const renderedGroups = Mustache.render(groupTemplate, { groups: groupObjectList })
    const renderedShortcuts = Mustache.render(shortcutTemplate, { groups: groupObjectList })
    document.getElementById('tab-groups').innerHTML = renderedGroups;
    document.getElementById('drop-groups-shortcuts').innerHTML = renderedShortcuts;
}