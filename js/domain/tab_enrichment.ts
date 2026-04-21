import { getDayjs } from '../shared/dayjs_runtime'
import { findDuplicateTabs } from './tab_duplicates'
import logger from '../shared/logger'
import dayjs from 'dayjs'

export interface EnrichableTab {
    id: number
    url: string
    title?: string
    pinned?: boolean
    locked?: boolean
    duplicate?: boolean
    today?: boolean
    dayFilter?: string
    timeValue?: number
    lastAccessed?: number
    lastAccessedFriendly?: string
    lastAccessedString?: string
    lastAccessedColor?: string
    urlWithoutHash?: string
    windowId: number
}

const dayjsApi = getDayjs()

function getUrlWithoutHash(url: string): string {
    const urlObject = new URL(url)
    urlObject.hash = ''
    return urlObject.toString()
}

export function enrichTabs(
    tabs: EnrichableTab[],
    isLockedFunc: (url: string) => boolean,
): void {
    logger.debug('Enriching tabs')
    for (const tab of tabs) {
        tab.urlWithoutHash = getUrlWithoutHash(tab.url)
        tab.locked = isLockedFunc(tab.url)

        let accessedTimeColor: string
        let accessedTime: dayjs.Dayjs
        if (tab.timeValue !== undefined) {
            accessedTime = dayjsApi(tab.timeValue)
            accessedTimeColor = 'black'
        } else {
            accessedTime = dayjsApi(tab.lastAccessed)
            accessedTimeColor = 'red'
        }

        tab.lastAccessedFriendly = accessedTime.fromNow()
        tab.lastAccessedString = accessedTime.format()
        tab.lastAccessedColor = accessedTimeColor

        if (accessedTime >= dayjsApi().subtract(1, 'day')) {
            tab.today = true
            tab.dayFilter = 'today'
        } else if (accessedTime >= dayjsApi().subtract(2, 'day')) {
            tab.dayFilter = 'yesterday'
        } else if (accessedTime >= dayjsApi().subtract(7, 'day')) {
            tab.dayFilter = 'thisWeek'
        } else if (accessedTime >= dayjsApi().subtract(1, 'month')) {
            tab.dayFilter = 'thisMonth'
        } else {
            tab.dayFilter = 'older'
        }
    }

    const duplicateTabs = findDuplicateTabs(tabs)

    for (const tab of tabs) {
        if (duplicateTabs.includes(tab)) {
            tab.duplicate = true
        }
    }
}

export default {
    enrichTabs,
}