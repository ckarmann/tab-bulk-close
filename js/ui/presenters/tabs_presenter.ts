import { matchesActiveFilters } from '../../shared/filter_state'
import type { ActiveFilters, TabsModel } from '../../shared/contracts'


export interface WindowViewModel {
  id: number
  windowColor: string
  tabCount: number
}

export interface TabViewItem {
  id: number
  url: string
  title?: string
  pinned?: boolean
  locked?: boolean
  duplicate?: boolean
  filtered: boolean
  windowId?: number
  windowColor?: string
  lastAccessedFriendly?: string
  lastAccessedString?: string
  lastAccessedColor?: string
  dayFilter?: string
}

export interface DomainViewModel {
  name: string
  id: string
  items: TabViewItem[]
}

export interface GroupViewModel {
  name: string
  id: string
  tabCount: number
  info: string
  isOthers: boolean
  subgroups: DomainViewModel[]
}

export interface TabsViewModel {
  groups: GroupViewModel[]
  windows: WindowViewModel[]
}


// from https://sashamaps.net/docs/resources/20-colors/
// (Accessibility:99%)
// Stable color assignment for window badges across rerenders.
const colorList = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#42d4f4', '#f032e6', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#000075', '#a9a9a9', '#ffffff', '#000000']
let nextColor = 0;
const windowIdColorMap = new Map<number, string>();

function attributeWindowColor(windowId: number): string {
    if (windowIdColorMap.has(windowId)) {
        return windowIdColorMap.get(windowId)!;
    }

    const newColor = colorList[nextColor];
    nextColor = (nextColor + 1) % colorList.length;
    windowIdColorMap.set(windowId, newColor);
    return newColor;
}

export default function buildTabsView(tabsModel: TabsModel, activeFilter: ActiveFilters): TabsViewModel {

    const groups = tabsModel.groups.map(group => ({
            ...group,
            info: '', // calculated later.
            subgroups: group.subgroups
            .map(domain => ({
                ...domain,
                items: domain.items
                .map(tab => ({
                    ...tab,
                    windowColor: attributeWindowColor(tab.windowId!),
                    filtered: matchesActiveFilters(tab, activeFilter),
                }))
                .filter(tab => tab.filtered)
                .sort((a, b) => a.url.localeCompare(b.url))
            }))
            .filter(domain => domain.items.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name))
        }))

    groups.forEach(group => {
        let closableCount = 0;
        for (const domain of group.subgroups) {
            for (const tab of domain.items) {
                if (!(tab.pinned || tab.locked)) {
                    closableCount++;
                }
            }
        }
        group.info = `${closableCount}/${group.tabCount}`;
    })
    
    return {
        groups,
        windows: tabsModel.windows
            .toSorted((a, b) => a.id - b.id)
            .map(window => ({
                ...window,
                windowColor: attributeWindowColor(window.id),
            }))
    }
}
