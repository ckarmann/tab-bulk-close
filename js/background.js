import "./polyfill/browser-polyfill.js";
import { notifyStateChanged } from '/js/shared/background_notify.js'
"use strict";

console.log("Starting");

async function markTabAccessTime(tab) {
    return browser.sessions.setTabValue(tab.id, "lastUpdatedOrAccessed", Date.now());
}

function openTab() {
    // switch to plugin's tab or open it.
    const page_url = browser.runtime.getURL("tabs/tabs.html"); 
    browser.tabs.query({ url: page_url}).then((tabs) => {
        if (tabs.length > 0) {
            var tab = tabs[0];
            browser.windows.update(tab.windowId, {
                focused: true
            });
            browser.tabs.update(tab.id, {
                active: true
            });
        }
        else {
            browser.tabs.create({ url: "tabs/tabs.html" });
        }
    });
}

browser.action.onClicked.addListener(openTab);

browser.tabs.onCreated.addListener((tab) => {
    console.log(`The tab with id: ${tab.id}, is being created.`);
    notifyStateChanged('tab_created', { changedTabIds: [tab.id] });
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    //console.log(`The tab with id: ${tabId}, is closing`);
    notifyStateChanged('tab_removed', { changedTabIds: [tabId] });
});


browser.tabs.onActivated.addListener(async (activeInfo) => {
    console.log(`onActivated: ${JSON.stringify(activeInfo)}`);
    try {
        const tabId = activeInfo.tabId;
        const tab = await browser.tabs.get(tabId);
        await markTabAccessTime(tab);
        await notifyStateChanged('tab_activated', { changedTabIds: [tabId] });
    } catch (error) {
        console.error('Failed to handle tabs.onActivated:', error);
    }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log(`Tab with id: ${tabId} had change: ${JSON.stringify(changeInfo)}. active=${tab.active}`);

    try {
        if ("title" in changeInfo) {
            await notifyStateChanged('tab_updated_title', { changedTabIds: [tabId], title: changeInfo.title });
        }

        const shouldRefreshActiveTab = Boolean(tab?.active) && (
            "url" in changeInfo ||
            ("status" in changeInfo && changeInfo.status === "complete")
        );

        if (shouldRefreshActiveTab) {
            const currentTab = await browser.tabs.get(tabId);
            await markTabAccessTime(currentTab);
            await notifyStateChanged('tab_updated', { changedTabIds: [tabId] });
        }
    } catch (error) {
        console.error('Failed to handle tabs.onUpdated:', error);
    }
})

export { notifyStateChanged }
