import { handleDragStart, handleDragEnd, handleBoxDragOver, handleBoxDragEnter, handleBoxDragLeave, handleDrop } from './tabs.js';
import TabsService from '/js/tabs_service.js'
import StateService from '/js/state_service.js'
import Filters from '/js/filters.js'

// Mechanism to trigger refreshes of the page, only when there is a change.
var isDirty = true;

export async function refreshNow() {
    setDirtyAndRefresh(0);
}

export async function setDirtyAndRefresh(delayMs) {
    isDirty = true;
    if (delayMs == 0) {
        refresh();
    } else {
        delay(delayMs).then(refresh);
    }
}

function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

async function refresh() {
    if (isDirty) {
        console.log("--------- refresh");
        const state = await StateService.loadState();
        console.log(state);
        listTabs(state);
    }
    isDirty = false;
}

// page refresh implementation.
function listTabs(state) {
    TabsService.getAllTabs().then((tabs) => refreshDisplay(tabs, state));
}

function filterTab(tab) {
    return Filters.filter(tab);
}


export function refreshDisplay(tabs, state) {
    console.log(tabs);
    const [groups, groupMap, domainMap] = state.applyGrouping(tabs);

    const groupObjectList = []

    for (let group of groups) {
        let groupHasDuplicates = false;

        const domains = groupMap[group] === undefined ? [] : Object.values(groupMap[group]);
        
        // count tabs and add metadata.
        let tabCount = 0;
        let closableCount = 0;
        const domainObjects = []
        for (let domain of domains) {

            let d = { 
                domain: domain,
                hasDuplicates: false,
                filteredCount: 0,
            };
            domainObjects.push(d);
            const tabs = domainMap[domain];
            for (let tab of tabs) {
                tabCount ++;
                tab.urlWithoutHash = getUrlWithoutHash(tab.url)
                tab.locked = state.isLocked(tab.url);
                tab.lastUpdated = new Date(state.urlDates[tab.urlWithoutHash]).toLocaleDateString()
            }
            const duplicateTabs = findDuplicateTabs(tabs);
            
            for (let tab of tabs) {
                if (duplicateTabs.includes(tab)) {
                    tab.duplicate = true;
                }
                tab.filtered = filterTab(tab);
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
                    "items": Object.values(domainMap[domain.domain]).filter(tab => tab.filtered)
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


function findDuplicateTabs(tabs) {
    const duplicateTabs = []
    for (let i = 0; i< tabs.length; i++) {
        for (let j = 0; j < tabs.length; j++) {
            if (i !== j) {
                if (getUrlWithoutHash(tabs[i].url) === getUrlWithoutHash(tabs[j].url)) {
                    duplicateTabs.push(tabs[i]);
                    break;
                }
            }
        }
    }
    return duplicateTabs;
}


function getUrlWithoutHash(url) {
    let urlObject = new URL(url);
    urlObject.hash = "";
    let urlWithoutHash = urlObject.toString();
    return urlWithoutHash;
}

