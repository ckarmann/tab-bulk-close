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
    await dispatchCommandAndRefresh({
            type: 'command:move_domain',
            payload: { domain, newGroup },
        },
        'Failed to dispatch move_domain command'
    );
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
    await dispatchCommandAndRefresh(
        {
            type: 'command:toggle_lock',
            payload: { url },
        },
        'Failed to dispatch toggle_lock command'
    );
}


// group actions

async function extractGroup(group) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:extract_group',
            payload: { group },
        },
        'Failed to dispatch extract_group command'
    );
}


async function closeGroup(groupName) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:close_group',
            payload: { groupName },
        },
        'Failed to dispatch close_group command'
    );
}

async function dispatchCommandAndRefresh(message, errorPrefix) {
    try {
        const response = await browser.runtime.sendMessage(message);

        if (response?.ok) {
            refreshNow();
        }
    } catch (error) {
        console.error(`${errorPrefix}:`, error);
    }
}


// group management
async function addGroup(newGroupName) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:add_group',
            payload: { newGroupName },
        },
        'Failed to dispatch add_group command'
    );
}


async function ungroup(groupName) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:ungroup',
            payload: { groupName },
        },
        'Failed to dispatch ungroup command'
    );
}

async function getLiveUrls() {
    let tabs = await TabsService.getAllTabs();
    let urls = []
    for (let tab of tabs) {
        urls.push(tab.url)
    }
    return urls;
}

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

Filters.init(refreshNow);