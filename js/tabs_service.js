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