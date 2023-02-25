export default {
    State: function(groups, mapping, urlDates, urlLock) {
        this.groups = groups || [ "Others" ];
        this.mapping = mapping || {};
        this.urlDates = urlDates || {};
        this.urlLock = urlLock || {};

        function cleanMapping(mapping, groups) {
    
            for (let domain of Object.keys(mapping)) {
                const group = mapping[domain];
                if (!groups.includes(group)) {
                    console.log("Mapping lost: " + domain + " => " + group);
                    delete mapping[domain];
                }
            }
        }

        this.applyGrouping = function(tabs) {
            let groups = this.groups;
            let mapping = this.mapping;
            if (!groups) {
                groups = ["Others"];
            }
            if (!mapping) {
                mapping = {};
            }
        
            // console.log(groups);
            // console.log(tabs);
            // console.log(mapping);
            cleanMapping(mapping, groups);
        
            
            // 1. group tabs by domain
            let domainMap = {};
            for (let tab of tabs) {
                let urlString = tab.url;
                let url = new URL(urlString);
                let domain = url.hostname;
                // handle stuff like about: pages.
                if (domain === '') {
                    domain = urlString;
                }
                if (domainMap[domain]) {
                    domainMap[domain].push(tab);
                } else {
                    domainMap[domain] = [tab];
                }
            }
        
            // 2. classify each domain
            let groupMap = {};
            for (let domain of Object.keys(domainMap)) {
                let domainGroup;
                if (domain in mapping) {
                    domainGroup = mapping[domain];
                }
                else {
                    domainGroup = 'Others';
                }
                if (groupMap[domainGroup]) {
                    groupMap[domainGroup].push(domain);
                } else {
                    groupMap[domainGroup] = [domain];
                }
            }
        
            // 2.5 Put "Others" at the end.
            let otherGroup = groupMap["Others"];
            if (otherGroup) {
                delete groupMap["Others"];
                groupMap["Others"] = otherGroup;
            }
        
            return [groups, groupMap, domainMap];
        }

    },

    loadState : async function () {
        const state = await browser.storage.local.get(["groups", "mapping", "urlDates", "urlLock"])
        return new this.State(state.groups, state.mapping, state.urlDates, state.urlLock);
    },

    saveState : async function (state) {
        let stateObject = {
            "groups": state.groups,
            "mapping": state.mapping,
            "urlDates": state.urlDates,
            "urlLock": state.urlLock
        }
        await browser.storage.local.set(stateObject);
    },

    setDomainGroupAndSave: async function(domain, newGroup) {
        const state = await this.loadState();
        state.mapping[domain] = newGroup;
        await this.saveState(state);
        return state;
    },

    addGroupAndSave: async function(newGroupName) {
        const state = await this.loadState();
        state.groups.unshift(newGroupName);
        await this.saveState(state);
        return state;
    }
}