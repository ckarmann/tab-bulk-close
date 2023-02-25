function cleanMapping(mapping, groups) {
    
    for (let domain of Object.keys(mapping)) {
        const group = mapping[domain];
        if (!groups.includes(group)) {
            console.log("Mapping lost: " + domain + " => " + group);
            delete mapping[domain];
        }
    }
}


export default {
    State: function(groups, mapping, urlDates, lockedUrls) {
        this.groups = groups || [ "Others" ];
        this.mapping = mapping || {};
        this.urlDates = urlDates || {};
        this.lockedUrls = lockedUrls || [];

        this.isLocked = function(urlString) {
            return lockedUrls.includes(urlString);
        }

        this.isTabInGroup = function(urlString, groupName) {
            let url = new URL(urlString);
            let domain = url.hostname;
            // handle stuff like about: pages.
            if (domain === '') {
                domain = urlString;
            }
            let domainGroup = mapping[domain]
            return domainGroup == groupName;
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
        const state = await browser.storage.local.get(["groups", "mapping", "urlDates", "lockedUrls"])
        return new this.State(state.groups, state.mapping, state.urlDates, state.lockedUrls);
    },

    saveState : async function (state) {
        let stateObject = {
            "groups": state.groups,
            "mapping": state.mapping,
            "urlDates": state.urlDates,
            "lockedUrls": state.lockedUrls
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
    },

    removeGroupAndSave: async function(groupName) {
        const state = await this.loadState();

        let groups = state.groups;
        let mapping = state.mapping;

        const groupIndex = groups.indexOf(groupName);
        if (groupIndex > -1) {
            groups.splice(groupIndex, 1);

            cleanMapping(mapping, groups);

            await this.saveState(state);
            return true;
        }
        return false;
    }
}