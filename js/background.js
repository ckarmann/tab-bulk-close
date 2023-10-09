import "./polyfill/browser-polyfill.js";
"use strict";

console.log("Starting");

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
