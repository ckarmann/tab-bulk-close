import renderTabsView from '../js/ui/renderers/tabs_renderer.ts'
import Filters from '../js/filters.ts'

document.addEventListener("DOMContentLoaded", () => {
    requestSnapshotAndRender();
});


// Drag and drop of domains over groups

interface DragTarget extends HTMLElement {
    dragCount?: number
}

export function handleDragStart(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.style.opacity = '0.4';

    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('domain', target.dataset.domain!);
}

export function handleDragEnd(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    let boxes = document.querySelectorAll('.group-box');
    boxes.forEach(function (box) {
        box.classList.remove('over');
    });
}

async function moveDomainToGroup(newGroup: string, domain: string) {
    await dispatchCommandAndRefresh({
            type: 'command:move_domain',
            payload: { domain, newGroup },
        },
        'Failed to dispatch move_domain command'
    );
}

export function handleDrop(e: DragEvent) {
    e.stopPropagation(); // stops the browser from redirecting.

    const target = (e.target as Element).closest(".drop-target") as HTMLElement | null;
    if (target) {
        let newGroup = target.dataset.group!;
        let domain = e.dataTransfer!.getData('domain');

        moveDomainToGroup(newGroup, domain);

        return false;
    }
}

export function handleBoxDragOver(e: DragEvent) {
    e.preventDefault();
    return false;
}

export function handleBoxDragEnter(e: DragEvent) {
    const target = (e.target as Element).closest(".drop-target") as DragTarget | null;
    if (target) {
        target.classList.add('over');
        if (target.dragCount === undefined) {
            target.dragCount = 1;
        } else {
            target.dragCount++;
        }
    }
}

export function handleBoxDragLeave(e: DragEvent) {
    const target = (e.target as Element).closest(".drop-target") as DragTarget | null;
    if (target) {
        target.dragCount!--;
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
document.addEventListener("click", (e: MouseEvent) => {

    console.log(e);
    const target = e.target as HTMLElement;

    // group management
    if (target.id == "add-group-button") {
        let newGroupName = (document.getElementById('add-group-name') as HTMLInputElement).value;
        addGroup(newGroupName);
    }
    // click on links to switch to the link's tab.
    else if (target.classList.contains('switch-tabs')) {
        var tabId = +target.dataset.tabId!;

        browser.tabs.get(tabId).then((tab) => {
            browser.windows.update(tab.windowId!, {
                focused: true
            });
            browser.tabs.update(tabId, {
                active: true
            });
        });
    }
    else if (target.classList.contains('group-shortcut')) {
        var group = target.dataset.group!;
        const groupBox = document.querySelector('.group-box[data-group="' + group + '"]');
        groupBox?.scrollIntoView();
    }
    else if (target.classList.contains('extract-group')) {
        extractGroup((target.closest(".group-box") as HTMLElement)!.dataset.group!);
    }
    else if (target.classList.contains('ungroup-group')) {
        ungroup((target.closest(".group-box") as HTMLElement)!.dataset.group!);
    }
    else if (target.classList.contains('close-group')) {
        closeGroup((target.closest(".group-box") as HTMLElement)!.dataset.group!);
    }
    else if (target.classList.contains('close-tab')) {
        var tabId = +target.dataset.tabId!;
        browser.tabs.remove(tabId);
    }
    else if (target.classList.contains('lock')) {
        var url = target.dataset.url!;
        toggleLock(url);
    }

    e.preventDefault();
});


document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key == "Control") {
        if (!document.body.classList.contains("advancedEnabled")) {
            document.body.classList.add("advancedEnabled");
        }
    }
});

document.addEventListener("keyup", (e: KeyboardEvent) => {
    if (e.key == "Control") {
        if (document.body.classList.contains("advancedEnabled")) {
            document.body.classList.remove("advancedEnabled");
        }
    }
});


// locking
async function toggleLock(url: string) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:toggle_lock',
            payload: { url },
        },
        'Failed to dispatch toggle_lock command'
    );
}


// group actions

async function extractGroup(group: string) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:extract_group',
            payload: { group },
        },
        'Failed to dispatch extract_group command'
    );
}


async function closeGroup(groupName: string) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:close_group',
            payload: {
                groupName,
                activeFilters: Filters.state || {},
            },
        },
        'Failed to dispatch close_group command'
    );
}

async function dispatchCommandAndRefresh(message: object, errorPrefix: string) {
    try {
        const response = await browser.runtime.sendMessage(message);

        if (response?.ok) {
            await requestSnapshotAndRender();
        }
    } catch (error) {
        console.error(`${errorPrefix}:`, error);
    }
}


// group management
async function addGroup(newGroupName: string) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:add_group',
            payload: { newGroupName },
        },
        'Failed to dispatch add_group command'
    );
}


async function ungroup(groupName: string) {
    await dispatchCommandAndRefresh(
        {
            type: 'command:ungroup',
            payload: { groupName },
        },
        'Failed to dispatch ungroup command'
    );
}

function delay(milliseconds: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

async function requestSnapshotAndRender(delayMs = 0) {
    if (delayMs > 0) {
        await delay(delayMs);
    }

    try {
        const response = await browser.runtime.sendMessage({
            type: 'query:get_tabs_snapshot',
            payload: {
                activeFilters: Filters.state || {},
            },
        });

        if (response?.ok && response?.result?.viewModel) {
            renderTabsView(response.result.viewModel);
        }
    } catch (error) {
        console.error('Failed to fetch tabs snapshot:', error);
    }
}

browser.runtime.onMessage.addListener((message: any) => {
    if (message?.type === 'state_changed') {

        if (message?.payload?.reason === 'tab_created') {
            requestSnapshotAndRender(250);
        }
        else if (message?.payload?.reason === 'tab_removed') {
            requestSnapshotAndRender(250);
        }
        else if (message?.payload?.reason === 'tab_activated') {
            requestSnapshotAndRender();
        }
        else if (message?.payload?.reason === 'tab_updated') {
            requestSnapshotAndRender();
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

Filters.init(requestSnapshotAndRender);
