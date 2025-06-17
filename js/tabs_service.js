console.log("Tabs service start");

var _tabStatePolyfill = (function(undefined){

    var log = true;

    if (typeof browser.sessions !== 'undefined' && browser.sessions.getTabValue !== undefined) {
        return {
            getTabValue: function(tab, key) {
                if (log) {
                    console.log("getTabValue for tab " + tab.id + " and key " + key);
                }
                return browser.sessions.getTabValue(tab.id, key);
            },
            setTabValue: function(tab, key, value) {
                if (log) {
                    console.log("setTabValue for tab " + tab.id + ": " + key + " = " + value);
                }
                return browser.sessions.setTabValue(tab.id, key, value);
            }
        }
    } else {
        // TODO
        // Some browsers do not have functions getTabValue/setTabValue. Therefore we have to simulate it on our side.
        // The first idea could be simply a dictionary that maps a tab's id to a key/value map and store it in the extension's local storage.
        // The problem with that if the browser is configured to reopen tabs at startup, tab ids are not preserved after a restart.
        // So at startup, we have to match open tabs to their old state.
        // What is preserved: url, history, index of tab in the window and lastAccessed information.
        // History of a tab can not be accessed from an extension without injecting code into it, which we want to avoid.
        // It is possible that not everything can be preserved. This is really a best effort.
        if (log) console.log("Initialize tab registry.");

        // Private properties
        var registry = {
            current: {},		// A look up table of current registered tabs
            removed: {},		// A look up table of tabs closed in the current session.
            previous: null			// A look up table of tab from the previous session not yet registered this session.
        },
        listeners = {
            onAdded: [],
            onRemoved: []
        },
        toRegister = [];		// Temporary store of tab which are created before registry has been retrieved.

        // Write the tab registry to persistent storage.
        async function write() {
            browser.storage.local.set({TabRegistry: registry.current});
            if (log) console.info('Registry written to storage.', JSON.parse(JSON.stringify(registry.current)));
        }

        function setRegistryEntry(tab, tabKey) {
            const tabState = {
                tabId: tab.id,
                url: tab.url,
                windowId: tab.windowId,
                lastAccessed: tab.lastAccessed,
                index: tab.index,
                dict: {}
            };
            registry.current[tabKey] = tabState;
            return tabState;
        }

        function matchTab(tab) {
            const tabKey = "tabState-" + tab.id;
            var matched = null;
            if (tabKey in registry.previous) {
                matched = registry.previous[tabKey];
            } else {
                for (const previousEntry of Object.values(registry.previous)) {
                    if (tab.url == previousEntry.url &&
                        tab.index == previousEntry.index &&
                        tab.lastAccessed == previousEntry.lastAccessed
                    ) {
                        matched = previousEntry;
                        break;
                    }
                }
            }

            if (matched != null) {
                if (log) console.info('Matched tabid:' + tab.id + " to " + matched.tabId);
                if (log) console.log(tab);
                if (log) console.log(matched);
                const tabState = setRegistryEntry(tab, tabKey);
                tabState.dict = matched.dict;
            } else {
                if (log) console.warn('Unmatched tabid:' + tab.id);
            }
        }

        // Initialise
        var initPromise = browser.storage.local.get("TabRegistry")
        .then(items => {
            var i;
            registry.previous = items.TabRegistry || {};
            if (log) console.info('Previous sessions\'s registry retrieved from storage. ', JSON.parse(JSON.stringify(registry.previous)));
            return browser.tabs.query({})
            // .then(tabs => {
            //     return new Promise(resolve => {
            //         setTimeout(resolve, 100);
            //     })
            //     .then(() => tabs);
            // })
            .then(tabs => {
                if (log) console.info("Start matching tabs");
                for (const tab of tabs) {
                    matchTab(tab);
                }
                if (log) console.info("Finished matching tabs");
            });
        });

        async function getTabValue(tab, key) {
            const tabKey = "tabState-" + tab.id;

            if (!(tabKey in registry.current))  {
                if (log) console.log("In Get, Wait for init to finish.");
                await initPromise;
            }

            if (tabKey in registry.current) {
                return registry.current[tabKey].dict[key];
            } else {
                return undefined;
            }
        }

        async function getTabFromRegistryToWrite(tab) {
            const tabKey = "tabState-" + tab.id;

            if (!tabKey in registry.current)  {
                if (log) console.log("In getTabFromRegistryToWrite, Wait for init to finish.");
                await initPromise;
            }

            var tabState;
            if (tabKey in registry.current) {
                if (log) console.log("Pick old state for " + tab.id);
                tabState = registry.current[tabKey];
            } else {
                if (log) console.log("Create new state for " + tab.id);
                tabState = setRegistryEntry(tab, tabKey);
            }

            return tabState;
        }

        async function setTabValue(tab, key, value) {
            const tabState = await getTabFromRegistryToWrite(tab);
            tabState.dict[key] = value;
            return write();
        }

        function onCreated(tab) {
            if (log) console.log("XX - In onCreated for " + tab.id);
            updateTabAsync(tab);
        }

        async function updateTabAsync(tab) {
            const tabState = await getTabFromRegistryToWrite(tab);
            if (tabState.url != tab.url ||
                tabState.lastAccessed != tab.lastAccessed ||
                tabState.index != tab.index
            ) {
                tabState.url = tab.url;
                tabState.lastAccessed = tab.lastAccessed;
                tabState.index = tab.index;
                /*
                    tabId: tab.id,
                    url: tab.url,
                    windowId: tab.windowId,
                    lastAccessed: tab.lastAccessed,
                    index: tab.index,
                    dict: {}
                */
                await write();
            }
        }

        function onUpdatedOrLoad(tabId, info, tab) {
            if (log) console.log("XX - In onUpdatedOrLoad for " + tabId);
            if (log) console.info('Tab updated', tab);
            updateTabAsync(tab);
        }

        function updateTabIndexes() {
            if (log) console.log("XX - In updateTabIndexes");
            for (tabState in registry.current) {
                browser.tabs.get(tabState.tabId)
                .then(tab => {
                    if (tab.index != tabState.index) {
                        tabState.index = tab.index;
                        return write();
                    }
                });
            }
            write();
        }

        function onRemoved(tabId) {
            if (log) console.log("XX - In onRemoved for " + tabId);
        }

        function onReplaced(tabId) {
            if (log) console.log("XX - In onReplaced for " + tabId);
        }


        // Add the listeners
        browser.tabs.onCreated.addListener(onCreated);
        browser.tabs.onUpdated.addListener(onUpdatedOrLoad);
        browser.tabs.onMoved.addListener(updateTabIndexes);
        browser.tabs.onDetached.addListener(updateTabIndexes);
        browser.tabs.onAttached.addListener(updateTabIndexes);
        browser.tabs.onRemoved.addListener(onRemoved);
        if (browser.tabs.onReplaced) browser.tabs.onReplaced.addListener(onReplaced); // Not in stable yet


        return {
            getTabValue: getTabValue,
            setTabValue: setTabValue
        }
    }
})();

export default {
    getAllTabs: () => {
        function getTabTime(tab) {
            return _tabStatePolyfill.getTabValue(tab, "lastUpdatedOrAccessed")
            .then((lastUpdatedOrAccessed) => {
                tab.timeValue = lastUpdatedOrAccessed;
                return tab;
            });
        }

        return browser.tabs.query({})
        .then(tabs => Promise.all(tabs.map(getTabTime)));
    },
    getTabValue: _tabStatePolyfill.getTabValue,
    setTabValue: _tabStatePolyfill.setTabValue
}