import { getDayjs } from '/js/dayjs/runtime.js'
import { matchesActiveFilters } from '/js/shared/filter_state.js'
import { findDuplicateTabs } from '/js/domain/tab_duplicates.js'

const dayjsApi = getDayjs();

function getUrlWithoutHash(url) {
    let urlObject = new URL(url);
    urlObject.hash = "";
    let urlWithoutHash = urlObject.toString();
    return urlWithoutHash;
}

export function enrichTabs(tabs, isLockedFunc, activeFilters = {}) {
    console.log("Enriching tabs");
    for (let tab of tabs) {
        tab.urlWithoutHash = getUrlWithoutHash(tab.url)
        tab.locked = isLockedFunc(tab.url);

        var accessedTimeColor;
        var accessedTime;
        if (tab.timeValue !== undefined) {
            accessedTime = dayjsApi(tab.timeValue);
            accessedTimeColor = "black";
        } else {
            // console.log("Undefined timeValue for " + tab.id + ": " + tab.title);
            accessedTime = dayjsApi(tab.lastAccessed);
            accessedTimeColor = "red";
        }

        tab.lastAccessedFriendly = accessedTime.fromNow();
        tab.lastAccessedString = accessedTime.format();

        tab.lastAccessedColor = accessedTimeColor;

        if (accessedTime >= dayjsApi().subtract(1, 'day')) {
            tab.today = true;
            tab.dayFilter = "today";
        } else if (accessedTime >= dayjsApi().subtract(2, 'day')) {
            tab.dayFilter = "yesterday";
        } else if (accessedTime >= dayjsApi().subtract(7, 'day')) {
            tab.dayFilter = "thisWeek";
        } else if (accessedTime >= dayjsApi().subtract(1, 'month')) {
            tab.dayFilter = "thisMonth";
        } else {
            tab.dayFilter = "older";
        }

    }
    const duplicateTabs = findDuplicateTabs(tabs);
    
    for (let tab of tabs) {
        if (duplicateTabs.includes(tab)) {
            tab.duplicate = true;
        }
        tab.filtered = matchesActiveFilters(tab, activeFilters);
    }
}

export default {
    enrichTabs,
}