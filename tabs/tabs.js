import { setDirtyAndRefresh, refreshNow } from './tabs_view.js';
import StateService from '/js/state_service.js'
import TabsService from '/js/tabs_service.js'

document.addEventListener("DOMContentLoaded", setDirtyAndRefresh);


// Drag and drop of domains over groups
let dragSrcEl;

export function handleDragStart(e) {
    this.style.opacity = '0.4';

    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('domain', this.dataset.domain);
}

export function handleDragEnd(e) {
    this.style.opacity = '1';
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
    // "this" is the category box in which to drop the domain.
    e.stopPropagation(); // stops the browser from redirecting.

    let newGroup = this.dataset.group;
    let domain = e.dataTransfer.getData('domain');

    moveDomainToGroup(newGroup, domain);

    return false;
}

export function handleBoxDragOver(e) {
    e.preventDefault();
    return false;
}

export function handleBoxDragEnter(e) {
    this.classList.add('over');
    this.dragCount++;
}

export function handleBoxDragLeave(e) {
    this.dragCount--;
    if (this.dragCount == 0) {
        this.classList.remove('over');
    }
}


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
        extractGroup(e.target.dataset.group);
    }
    else if (e.target.classList.contains('ungroup-group')) {
        ungroup(e.target.dataset.group);
    }
    else if (e.target.classList.contains('close-group')) {
        closeGroup(e.target.dataset.group);
    }
    else if (e.target.classList.contains('lock')) {
        var url = e.target.dataset.url;
        toggleLock(url);
    }

    e.preventDefault();
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
    let state = await StateService.loadState();

    TabsService.getAllTabs().then((tabs) => {
        for (let tab of tabs) {
            let urlString = tab.url;

            if (!state.isLocked(urlString) && state.isTabInGroup(urlString, groupName)) {
                console.log("Remove tab " + tab.id);
                browser.tabs.remove(tab.id);
            }
        }
    });
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


async function setRefreshDate(urlString, date) {
    let url = new URL(urlString);
    url.hash = "";
    let liveUrls = await getLiveUrls();
    await StateService.setRefreshDate(url.toString(), date, liveUrls);
}


// Listeners for tab activity
browser.tabs.onCreated.addListener((tab) => {
    console.log(`The tab with id: ${tab.id}, is being created.`);
    tab.createdAt = Date.now();
    setDirtyAndRefresh(250);
});


browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log(`The tab with id: ${tabId}, is closing`);
    setDirtyAndRefresh(250);
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if ("url" in changeInfo) {
        console.log(`Tab with id: ${tabId} was set to URL: ${changeInfo.url}`);
        await setRefreshDate(changeInfo.url, Date.now());
        refreshNow();
    }
    if ("title" in changeInfo) {
        console.log(`Tab with id: ${tabId} was set the title: ${changeInfo.title}`);
        refreshNow();
    }
})