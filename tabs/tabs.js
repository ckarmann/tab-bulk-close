import { setDirtyAndRefresh, refreshNow } from './tabs_view.js';
import StateService from '/js/state_service.js'

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
    e.preventDefault();
});

// group management
async function addGroup(newGroupName) {
    await StateService.addGroupAndSave(newGroupName);
    refreshNow();
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

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ("url" in changeInfo) {
        console.log(`Tab with id: ${tabId} was set to URL: ${changeInfo.url}`);
        refreshNow();
    }
    if ("title" in changeInfo) {
        console.log(`Tab with id: ${tabId} was set the title: ${changeInfo.title}`);
        refreshNow();
    }
})