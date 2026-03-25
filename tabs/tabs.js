import { setDirtyAndRefresh, refreshNow } from './tabs_view.js';
import StateService from '/js/state_service.js'
import TabsService from '/js/tabs_service.js'
import Filters from '/js/filters.js'
import addGroupCommand from '/js/app/commands/add_group.js'
import ungroupCommand from '/js/app/commands/ungroup.js'
import moveDomainCommand from '/js/app/commands/move_domain.js'
import toggleLockCommand from '/js/app/commands/toggle_lock.js'
import closeGroupCommand from '/js/app/commands/close_group.js'
import extractGroupCommand from '/js/app/commands/extract_group.js'

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
    await moveDomainCommand({
        domain,
        newGroup,
        onChanged: refreshNow,
    });
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
    await toggleLockCommand({
        url,
        onChanged: refreshNow,
    });
}


// group actions

async function extractGroup(group) {
    await extractGroupCommand({
        group,
        onChanged: refreshNow,
    });
}


async function closeGroup(groupName) {
    await closeGroupCommand({
        groupName,
        onChanged: refreshNow,
    });
}


// group management
async function addGroup(newGroupName) {
    await addGroupCommand({
        newGroupName,
        onChanged: refreshNow,
    });
}


async function ungroup(groupName) {
    await ungroupCommand({
        groupName,
        onChanged: refreshNow,
    });
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
browser.windows.onFocusChanged.addListener(async (windowId) => {
    console.log(`The window ${windowId} is focused. Last one was ${lastFocusedWindow}.`);
    if (windowId != -1 && lastFocusedWindow != windowId) {
        const tabs = await browser.tabs.query({
            "windowId": windowId,
            "active": true
        });
        if (tabs.length == 0) {
            // this may happen if the new focused window is the Developer Tools window for example.
            console.debug("No active tabs in window " + windowId);
        } else {
            lastFocusedWindow = windowId;
            await markTabAccessTime(tabs[0]);
            refreshNow();
        }
    }
})

browser.runtime.onMessage.addListener((message) => {
    if (message?.type === 'state_changed') {

        if (message?.payload?.reason === 'tab_created') {
            setDirtyAndRefresh(250);
        }
        else if (message?.payload?.reason === 'tab_removed') {
            setDirtyAndRefresh(250);
        }
        else if (message?.payload?.reason === 'tab_activated') {
            refreshNow();
        }
        else if (message?.payload?.reason === 'tab_updated') {
            refreshNow();
        }
        else if (message?.payload?.reason === 'tab_updated_title') {
            // don't refresh the whole page.
            var tabId = message.payload.changedTabIds[0];
            var linkElement = document.querySelector(`.switch-tabs[data-tab-id='${tabId}']`);
            if (linkElement) {
                linkElement.textContent = message.payload.title;
            }
        }
    }
});

// Listeners for tab activity
async function markTabAccessTime(tab) {
    return TabsService.setTabValue(tab, "lastUpdatedOrAccessed", Date.now());
}

Filters.init(refreshNow);