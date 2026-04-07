import stateRepository from '../../infra/repositories/state_repository'
import TabsService from '../../tabs_service.ts'
import TabsGateway from '../../infra/browser/tabs_gateway'
import WindowsGateway from '../../infra/browser/windows_gateway'
import { applyGrouping } from '../../domain/tab_grouping'

interface ExtractGroupInput {
    group?: string
    stateRepository?: {
        loadState: () => Promise<{ groups: string[]; mapping: Record<string, string> }>
    }
    tabsService?: {
        getAllTabs: () => Promise<Array<{ id: number; windowId: number; url: string }>>
    }
    windowsGateway?: any
    tabsGateway?: any
    onChanged?: () => void
}

export default async function extractGroupCommand({
    group,
    stateRepository: repository = stateRepository,
    tabsService = TabsService,
    windowsGateway = WindowsGateway,
    tabsGateway = TabsGateway,
    onChanged,
}: ExtractGroupInput = {}) {
    if (!group) {
        return { ok: false, reason: 'empty-group' }
    }

    const stateData = await repository.loadState()
    const tabs = await tabsService.getAllTabs()

    const [, groupMap, domainMap] = applyGrouping(tabs, stateData.groups, stateData.mapping)
    const domains = groupMap[group]

    if (!domains || domains.length === 0) {
        return { ok: false, reason: 'group-has-no-domains' }
    }

    const tabIds: number[] = []
    const windowIds = new Set<number>()
    for (const domain of domains) {
        for (const tab of domainMap[domain]) {
            tabIds.push(tab.id as number)
            windowIds.add(tab.windowId as number)
        }
    }

    if (windowIds.size === 1) {
        const [windowId] = Array.from(windowIds)
        const windowInfo = await windowsGateway.get(windowId, { populate: true })

        if (windowInfo.tabs.length === tabIds.length) {
            await windowsGateway.update(windowId, { focused: true })
            await tabsGateway.update(tabIds[0], { active: true })
            return { ok: true, group, moved: false, reason: 'already-in-single-window' }
        }
    }

    const windowInfo = await windowsGateway.create({
        focused: true,
        tabId: tabIds[0],
    })

    await tabsGateway.move(tabIds, {
        windowId: windowInfo.id,
        index: -1,
    })

    if (typeof onChanged === 'function') {
        onChanged()
    }

    return { ok: true, group, moved: true, windowId: windowInfo.id, tabCount: tabIds.length }
}