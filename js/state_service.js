import Filters from '/js/filters.js'

function cleanMapping(mapping, groups) {
    
    for (let domain of Object.keys(mapping)) {
        const group = mapping[domain];
        if (!groups.includes(group)) {
            console.log("Mapping lost: " + domain + " => " + group);
            delete mapping[domain];
        }
    }
}

function findDuplicateTabs(tabs) {
    const duplicateTabs = []
    for (let i = 0; i< tabs.length; i++) {
        for (let j = 0; j < tabs.length; j++) {
            if (i !== j) {
                if (tabs[i].urlWithoutHash === tabs[j].urlWithoutHash) {
                    duplicateTabs.push(tabs[i]);
                    break;
                }
            }
        }
    }
    return duplicateTabs;
}

function getUrlWithoutHash(url) {
    let urlObject = new URL(url);
    urlObject.hash = "";
    let urlWithoutHash = urlObject.toString();
    return urlWithoutHash;
}

function getIsoDay(date) {
    if (isNaN(date)) {
        return undefined;
    } else {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().substr(0,10);
    }
}

function filterTab(tab) {
    return Filters.filter(tab);
}

export default {
    State: function(groups, mapping, urlDates, lockedUrls) {
        this.groups = groups || [ "Others" ];
        this.mapping = mapping || {};
        this.urlDates = urlDates || {};
        lockedUrls = lockedUrls || [];
        this.lockedUrls = lockedUrls;

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
    },

    toggleLock : async function(url) {
        const state = await this.loadState();
        const index = state.lockedUrls.indexOf(url);
        if (index > -1) {
            state.lockedUrls.splice(index, 1);
        } else {
            state.lockedUrls.push(url);
        }
        await this.saveState(state);
    },

    setRefreshDate: async function(url, date, liveUrls) {
        // load
        const state = await this.loadState();

        // clean old stuff.
        const cleanedDates = Object.fromEntries(liveUrls.map(url => [url, state.urlDates[url]]));
        state.urlDates = cleanedDates;

        // set new date
        state.urlDates[url] = date;

        // save
        await this.saveState(state);
    },

    enrichTabs: function(tabs, state) {
        // calculate days for date filtering.
        let tmpDate = new Date();
        const today = getIsoDay(tmpDate);
        tmpDate.setDate(tmpDate.getDate() - 1);
        const yesterday = getIsoDay(tmpDate);
        tmpDate = new Date(); tmpDate.setDate(tmpDate.getDate() - 7);
        const oneWeekAgo = getIsoDay(tmpDate);
        tmpDate = new Date(); tmpDate.setMonth(tmpDate.getMonth() - 1);
        const oneMonthAgo = getIsoDay(tmpDate);

        function colorHash(inputString){
            // from public domain code: https://github.com/RolandR/ColorHash/blob/master/colorhash.js
            var sum = 0;
            
            for(var i in inputString){
                sum += inputString.charCodeAt(i);
            }
        
            var r = ~~(('0.'+Math.sin(sum+1).toString().substr(6))*256);
            var g = ~~(('0.'+Math.sin(sum+2).toString().substr(6))*256);
            var b = ~~(('0.'+Math.sin(sum+3).toString().substr(6))*256);
        
            var rgb = "rgb("+r+", "+g+", "+b+")";
        
            var hex = "#";
        
            hex += ("00" + r.toString(16)).substr(-2,2).toUpperCase();
            hex += ("00" + g.toString(16)).substr(-2,2).toUpperCase();
            hex += ("00" + b.toString(16)).substr(-2,2).toUpperCase();
        
            return {
                 r: r
                ,g: g
                ,b: b
                ,rgb: rgb
                ,hex: hex
            };
        }

        for (let tab of tabs) {
            tab.urlWithoutHash = getUrlWithoutHash(tab.url)
            tab.locked = state.isLocked(tab.url);

            const day = getIsoDay(new Date(state.urlDates[tab.urlWithoutHash]));
            tab.lastUpdated = day;
            if (day >= today) {
                tab.today = true;
                tab.dayFilter = "today";
            } else if (day == yesterday) {
                tab.dayFilter = "yesterday";
            } else if (day >= oneWeekAgo) {
                tab.dayFilter = "thisWeek";
            } else if (day >= oneMonthAgo) {
                tab.dayFilter = "thisMonth";
            } else {
                tab.dayFilter = "older";
            }

            tab.windowColor = colorHash(tab.windowId.toString());
        }
        const duplicateTabs = findDuplicateTabs(tabs);
        
        for (let tab of tabs) {
            if (duplicateTabs.includes(tab)) {
                tab.duplicate = true;
            }
            tab.filtered = filterTab(tab);
        }
    }
}