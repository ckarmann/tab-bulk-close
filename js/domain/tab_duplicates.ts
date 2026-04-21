export interface DuplicateComparableTab {
    urlWithoutHash?: string
}

export function findDuplicateTabs<T extends DuplicateComparableTab>(tabs: T[]): T[] {
    const duplicateTabs: T[] = []
    for (let i = 0; i < tabs.length; i++) {
        for (let j = 0; j < tabs.length; j++) {
            if (i !== j) {
                if (tabs[i].urlWithoutHash === tabs[j].urlWithoutHash) {
                    duplicateTabs.push(tabs[i])
                    break
                }
            }
        }
    }
    return duplicateTabs
}

export default {
    findDuplicateTabs,
}