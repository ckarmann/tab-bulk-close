import { setDirtyAndRefresh, refreshNow } from './tabs_view.js';
import StateService from '/js/state_service.js'
import TabsService from '/js/tabs_service.js'
import Filters from '/js/filters.js'

document.addEventListener("DOMContentLoaded", setDirtyAndRefresh);


// Drag and drop of domains over groups

export function handleDragStart(e) {
    const target = e.target;
    target.style.opacity = '0.4';

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('domain', target.dataset.domain);
}

export function handleDragEnd(e) {
    const target = e.target;
    target.style.opacity = '1';
    let boxes = document.querySelectorAll('.group-box');
    boxes.forEach(function (box) {
        box.classList.remove('over');
    });
}

async function moveDomainToGroup(newGroup, domain) {
    await StateService.setDomainGroupAndSave(domain, newGroup);
    refreshNow();
}

export function handleDrop(e) {
    e.stopPropagation(); // stops the browser from redirecting.

    const target = e.target.closest(".drop-target");
    if (target) {
        let newGroup = target.dataset.group;
        let domain = e.dataTransfer.getData('domain');

        moveDomainToGroup(newGroup, domain);

        return false;
    }
}

export function handleBoxDragOver(e) {
    e.preventDefault();
    return false;
}

export function handleBoxDragEnter(e) {
    const target = e.target.closest(".drop-target")
    if (target) {
        target.classList.add('over');
        if (target.dragCount === undefined) {
            target.dragCount = 1;
        } else {
            target.dragCount++;
        }
}
}

export function handleBoxDragLeave(e) {
    const target = e.target.closest(".drop-target")
    if (target) {
        target.dragCount--;
        if (target.dragCount == 0) {
            target.classList.remove('over');
        }
    }
}


document.addEventListener('dragover', handleBoxDragOver);
document.addEventListener('dragenter', handleBoxDragEnter);
document.addEventListener('dragleave', handleBoxDragLeave);
document.addEventListener('drop', handleDrop);
document.addEventListener('dragstart', handleDragStart);
document.addEventListener('dragend', handleDragEnd);


// Handle all clicks
document.addEventListener("click", (e) => {

    console.log(e);

    // group management
    if (e.target.id == "add-group-button") {
        let newGroupName = document.getElementById('add-group-name').value;
        addGroup(newGroupName);
    } 
    // click on links to switch to the link's tab.
    else if (e.target.classList.contains('switch-tabs')) {
        var tabId = +e.target.dataset.tabId;

        browser.tabs.get(tabId).then((tab) => {
            browser.windows.update(tab.windowId, {
                focused: true
            });
            browser.tabs.update(tabId, {
                active: true
            });
        });
    }
    else if (e.target.classList.contains('group-shortcut')) {
        var group = e.target.dataset.group;
        const groupBox = document.querySelector('.group-box[data-group="' + group + '"]');
        groupBox.scrollIntoView();
    }
    else if (e.target.classList.contains('extract-group')) {
        extractGroup(e.target.closest(".group-box").dataset.group);
    }
    else if (e.target.classList.contains('ungroup-group')) {
        ungroup(e.target.closest(".group-box").dataset.group);
    }
    else if (e.target.classList.contains('close-group')) {
        closeGroup(e.target.closest(".group-box").dataset.group);
    }
    else if (e.target.classList.contains('close-tab')) {
        var tabId = +e.target.dataset.tabId;
        browser.tabs.remove(tabId);
    }
    else if (e.target.classList.contains('lock')) {
        var url = e.target.dataset.url;
        toggleLock(url);
    }

    e.preventDefault();
});


document.addEventListener("keydown", (e) => {
    if (e.key == "Control") {
        if (!document.body.classList.contains("advancedEnabled")) {
            document.body.classList.add("advancedEnabled");
        }
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key == "Control") {
        if (document.body.classList.contains("advancedEnabled")) {
            document.body.classList.remove("advancedEnabled");
        }
    }
});


// locking
async function toggleLock(url) {
    await StateService.toggleLock(url);
    refreshNow();
}


// group actions

async function extractGroup(group) {
    console.log("extract " + group);

    let state = await StateService.loadState();
    let tabs = await TabsService.getAllTabs();

    const [_, groupMap, domainMap] = state.applyGrouping(tabs);
    let domains = groupMap[group];

    let tabIds = [];
    let windowIds = new Set();
    for (let domain of domains) {
        for (let tab of domainMap[domain]) {

            tabIds.push(tab.id);
            windowIds.add(tab.windowId);
        }
    }
    if (windowIds.size == 1) {
        // already in one window.
        let [windowId] = windowIds;

        let windowInfo = await browser.windows.get(windowId, { populate: true });
        if (windowInfo.tabs.length == tabIds.length) {
            // no other tab in the window, useless to create a new one, just focus on the old.

            browser.windows.update(windowId, {
                focused: true
            });
            browser.tabs.update(tabIds[0], {
                active: true
            });
            return;
        }
    }
    

    let windowInfo = await browser.windows.create({
        focused: true,
        tabId: tabIds[0]
    });
    await browser.tabs.move(tabIds, {
        windowId: windowInfo.id,
        index: -1
    })
}


async function closeGroup(groupName) {
    if (groupName !== undefined) {

        let state = await StateService.loadState();
        console.log("close " + groupName);

        TabsService.getAllTabs().then((tabs) => {
            StateService.enrichTabs(tabs, state);
            for (let tab of tabs) {
                let urlString = tab.url;

                if (!tab.pinned && !state.isLocked(urlString) && state.isTabInGroup(urlString, groupName) &&
                    Filters.filter(tab)) {
                    console.log("Remove tab " + tab.id, tab.url);
                    browser.tabs.remove(tab.id);
                }
            }
            console.log("done close")
        });
    }
}


// group management
async function addGroup(newGroupName) {
    await StateService.addGroupAndSave(newGroupName);
    refreshNow();
}


async function ungroup(groupName) {
    if (await StateService.removeGroupAndSave(groupName)) {
        refreshNow();
    }
}

async function getLiveUrls() {
    let tabs = await TabsService.getAllTabs();
    let urls = []
    for (let tab of tabs) {
        urls.push(tab.url)
    }
    return urls;
}

var lastFocusedWindow = -1;
browser.windows.onFocusChanged.addListener((windowId) => {
    console.log(`The window ${windowId} is focused. Last one was ${lastFocusedWindow}.`);
    if (windowId != -1 && lastFocusedWindow != windowId) {
        browser.tabs.query({
                "windowId": windowId,
                "active": true
            }).then((tabs) => {
                if (tabs.length == 0) {
                    // this may happen if the new focused window is the Developer Tools window for example.
                    throw new Error("No active tabs in window " + windowId);
                } else {
                    // console.log("Active tabs of focused window:")
                    // console.log(tabs);
                    lastFocusedWindow = windowId;
                    return markTabAccessTime(tabs[0]);
                }
            })
            .then(refreshNow)
            .catch(e => console.warn(e));
    }
})

// Listeners for tab activity
browser.tabs.onCreated.addListener((tab) => {
    console.log(`The tab with id: ${tab.id}, is being created.`);
    tab.createdAt = Date.now();
    setDirtyAndRefresh(250);
});


browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    //console.log(`The tab with id: ${tabId}, is closing`);
    setDirtyAndRefresh(250);
});

function markTabAccessTime(tab) {
    return TabsService.setTabValue(tab, "lastUpdatedOrAccessed", Date.now());
}

browser.tabs.onActivated.addListener((activeInfo) => {
    console.log(`onActivated: ${JSON.stringify(activeInfo)}`);
    const tabId = activeInfo.tabId;
    browser.tabs.get(tabId)
    .then(markTabAccessTime)
    .then(refreshNow());
})

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log(`Tab with id: ${tabId} had change: ${JSON.stringify(changeInfo)}. active=${tab.active}`);

    if ("title" in changeInfo) {
        // don't refresh the whole page.
        var linkElement = document.querySelector(`.switch-tabs[data-tab-id='${tabId}']`);
        linkElement.textContent = changeInfo.title;
    }
    if (tab.active) {
        if ("url" in changeInfo) {
            browser.tabs.get(tabId)
            .then(markTabAccessTime)
            .then(refreshNow());
        }
        if ("status" in changeInfo && changeInfo["status"] == "complete") {
            browser.tabs.get(tabId)
            .then(markTabAccessTime)
            .then(refreshNow());
        }
    }
})

Filters.init(refreshNow);