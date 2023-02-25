import { handleDragStart, handleDragEnd, handleBoxDragOver, handleBoxDragEnter, handleBoxDragLeave, handleDrop } from './tabs.js';
import TabsService from '/js/tabs_service.js'
import StateService from '/js/state_service.js'

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
        console.log("--------- init");
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

export function refreshDisplay(tabs, state) {
    console.log(tabs);
    const [groups, groupMap, domainMap] = state.applyGrouping(tabs);

    console.log([groups, groupMap, domainMap]);

    // Build group HTML
    let groupsFragment = document.createDocumentFragment();
    let shortcutFragment = document.createDocumentFragment();
    for (let group of groups) {

        let thisGroupBox = document.createElement("div");
        let groupHeader = document.createElement("div");
        groupHeader.className = "groupHeader";
        let groupTitle = document.createElement("h2");
        groupTitle.textContent = group;
        groupTitle.classList.add("group-title");
        thisGroupBox.classList.add("group-box");
        groupHeader.appendChild(groupTitle);
        thisGroupBox.dataset.group = group;

        function addButton(buttonText, buttonClass, group) {
            let button = document.createElement("button");
            button.textContent = buttonText;
            button.classList.add(buttonClass);
            button.dataset.group = group;
            groupHeader.appendChild(button);
        }

        addButton("Extract", "extract-group", group);
        addButton("Ungroup", "ungroup-group", group);
        addButton("Close", "close-group", group);

        thisGroupBox.appendChild(groupHeader);

        let domains = groupMap[group];
        if (!domains) {
            domains = [];
        }
        let tabList = document.createDocumentFragment();
        let tabUl = document.createElement("ul");
        for (let domain of domains) {
            let domainList = document.createElement("li");
            let domainUl = document.createElement("ul");
            domainList.className = "domainList";
            domainList.setAttribute("draggable", "true");
            domainList.dataset.domain = domain;
            domainList.textContent = domain;
            domainList.appendChild(domainUl);
            domainList.addEventListener('dragstart', handleDragStart);
            domainList.addEventListener('dragend', handleDragEnd);
            tabUl.append(domainList);

            domainMap[domain].sort(function (a, b) {
                if (a.title < b.title) { return -1; }
                if (a.title > b.title) { return 1; }
                return 0;
            });

            for (let tab of domainMap[domain]) {
                let tabLi = document.createElement("li");
                let tabLink = document.createElement('a');
                tabLi.className = "tabList";

                const tabLock = document.createElement("span");
                tabLock.classList.add("lock");
                tabLock.dataset.url = tab.url;

                if (state.lockedUrls.includes(tab.url)) {
                    tabLock.innerHTML = "&#x1F512;&#xFE0E;";
                    tabLock.classList.add("locked");
                } else {
                    tabLock.innerHTML = "&#x1F513;&#xFE0E;";
                    tabLock.classList.add("unlocked");
                }


                tabLink.textContent = tab.title || tab.id;
                tabLink.setAttribute('href', tab.url);
                tabLink.classList.add('switch-tabs');
                tabLink.setAttribute("draggable", "false");
                //console.log(tabLink);
                tabLink.dataset.tabId = tab.id;

                // let tabDomainSpan = document.createElement('span');
                // tabDomainSpan.textContent = domain;
                // tabLi.appendChild(tabDomainSpan);
                const accessDateSpan = document.createElement('span');
                accessDateSpan.textContent = new Date(tab.lastAccessed).toLocaleDateString();

                const updateDateSpan = document.createElement('span');
                if (state.urlDates[tab.url] !== undefined) {
                    //console.log(urlDates[tab.url]);
                    updateDateSpan.textContent = new Date(state.urlDates[tab.url]).toLocaleDateString();
                }

                tabLi.appendChild(tabLock);
                tabLi.appendChild(tabLink);
                tabLi.appendChild(accessDateSpan);
                tabLi.appendChild(updateDateSpan);
                domainUl.appendChild(tabLi);
            }
        }
        // add a drop shortcut on top-right corner.
        let thisGroupShortCut = document.createElement("div");
        thisGroupShortCut.textContent = group;
        thisGroupShortCut.classList.add("group-shortcut");
        thisGroupShortCut.dataset.group = group;

        // put a comment here
        tabList.appendChild(tabUl);
        thisGroupBox.appendChild(tabList);

        // handle drag-drop
        thisGroupBox.addEventListener('dragover', handleBoxDragOver);
        thisGroupBox.addEventListener('dragenter', handleBoxDragEnter);
        thisGroupBox.addEventListener('dragleave', handleBoxDragLeave);
        thisGroupBox.addEventListener('drop', handleDrop);
        thisGroupBox.dragCount = 0;
        thisGroupShortCut.addEventListener('dragover', handleBoxDragOver);
        thisGroupShortCut.addEventListener('dragenter', handleBoxDragEnter);
        thisGroupShortCut.addEventListener('dragleave', handleBoxDragLeave);
        thisGroupShortCut.addEventListener('drop', handleDrop);
        thisGroupShortCut.dragCount = 0;

        groupsFragment.appendChild(thisGroupBox);
        shortcutFragment.appendChild(thisGroupShortCut);
    }

    // Add the fragment to the page, finally. 
    document.getElementById('tab-groups').replaceChildren(groupsFragment);
    document.getElementById('drop-groups-shortcuts').replaceChildren(shortcutFragment);
}
