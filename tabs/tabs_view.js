import TabsService from '/js/tabs_service.js'
import StateService from '/js/state_service.js'
import buildTabsViewModel from '/js/ui/presenters/tabs_presenter.js'
import renderTabsView from '/js/ui/renderers/tabs_renderer.js'

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
    const viewModel = buildTabsViewModel(tabs, state);
    renderTabsView(viewModel);
}