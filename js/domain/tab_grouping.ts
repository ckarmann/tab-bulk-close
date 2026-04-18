import logger from '../shared/logger'

export interface UrlTab {
    url: string
    [key: string]: unknown
}

export type DomainGroupMapping = Record<string, string>
export type DomainMap<T extends UrlTab> = Record<string, T[]>
export type GroupMap = Record<string, string[]>

export function cleanMapping(mapping: DomainGroupMapping, groups: string[]): void {
    for (const domain of Object.keys(mapping)) {
        const group = mapping[domain]
        if (!groups.includes(group)) {
            logger.debug(`Mapping removed: ${domain} => ${group}`)
            delete mapping[domain]
        }
    }
}

export function getDomainFromUrl(urlString: string): string {
    const url = new URL(urlString)
    const domain = url.hostname
    return domain === '' ? urlString : domain
}

export function buildDomainMap<T extends UrlTab>(tabs: T[]): DomainMap<T> {
    const domainMap: DomainMap<T> = {}

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

export function classifyDomains(
    domainMap: DomainMap<UrlTab>,
    mapping: DomainGroupMapping,
    defaultGroup = 'Others',
): GroupMap {
    const groupMap: GroupMap = {}

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

export function moveOthersToEnd(groupMap: GroupMap, othersGroup = 'Others'): GroupMap {
    const ordered = { ...groupMap }
    const otherGroup = ordered[othersGroup]
    if (otherGroup) {
        delete ordered[othersGroup]
        ordered[othersGroup] = otherGroup
    }
    return ordered
}

export function applyGrouping<T extends UrlTab>(
    tabs: T[],
    groups?: string[] | null,
    mapping?: DomainGroupMapping | null,
): [string[], GroupMap, DomainMap<T>] {
    const safeGroups = groups || ['Others']
    const safeMapping = mapping || {}

    cleanMapping(safeMapping, safeGroups)

    const domainMap = buildDomainMap(tabs)
    const classified = classifyDomains(domainMap, safeMapping)
    const groupMap = moveOthersToEnd(classified)

    return [safeGroups, groupMap, domainMap]
}

export function isTabInGroup(
    urlString: string,
    groupName: string,
    mapping: DomainGroupMapping = {},
): boolean {
    const domain = getDomainFromUrl(urlString)
    return mapping[domain] === groupName
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