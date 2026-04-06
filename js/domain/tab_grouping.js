export function cleanMapping(mapping, groups) {
    for (let domain of Object.keys(mapping)) {
        const group = mapping[domain];
        if (!groups.includes(group)) {
            console.log("Mapping lost: " + domain + " => " + group);
            delete mapping[domain];
        }
    }
}

export function getDomainFromUrl(urlString) {
    const url = new URL(urlString)
    const domain = url.hostname
    // Handle URLs with no hostname, e.g. about:*.
    return domain === '' ? urlString : domain
}

export function buildDomainMap(tabs) {
    const domainMap = {}

    for (const tab of tabs) {
        const domain = getDomainFromUrl(tab.url)
        if (domainMap[domain]) {
            domainMap[domain].push(tab)
        } else {
            domainMap[domain] = [tab]
        }
    }

    return domainMap
}

export function classifyDomains(domainMap, mapping, defaultGroup = 'Others') {
    const groupMap = {}

    for (const domain of Object.keys(domainMap)) {
        const domainGroup = domain in mapping ? mapping[domain] : defaultGroup
        if (groupMap[domainGroup]) {
            groupMap[domainGroup].push(domain)
        } else {
            groupMap[domainGroup] = [domain]
        }
    }

    return groupMap
}

export function moveOthersToEnd(groupMap, othersGroup = 'Others') {
    const ordered = { ...groupMap }
    const otherGroup = ordered[othersGroup]
    if (otherGroup) {
        delete ordered[othersGroup]
        ordered[othersGroup] = otherGroup
    }
    return ordered
}

export function applyGrouping(tabs, groups, mapping) {
    const safeGroups = groups || ['Others']
    const safeMapping = mapping || {}

    cleanMapping(safeMapping, safeGroups)

    const domainMap = buildDomainMap(tabs)
    const classified = classifyDomains(domainMap, safeMapping)
    const groupMap = moveOthersToEnd(classified)

    return [safeGroups, groupMap, domainMap]
}

export function isTabInGroup(urlString, groupName, mapping = {}) {
    const domain = getDomainFromUrl(urlString)
    return mapping[domain] == groupName
}

export default {
    applyGrouping,
    buildDomainMap,
    classifyDomains,
    cleanMapping,
    getDomainFromUrl,
    isTabInGroup,
    moveOthersToEnd,
}