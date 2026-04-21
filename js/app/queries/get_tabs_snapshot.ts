import TabsService from '../../tabs_service.ts'
import stateRepository from '../../infra/repositories/state_repository'
import { buildTabsModel } from '../../domain/tab_grouping.ts'
import type { GetTabsSnapshotPayload, GetTabsSnapshotResult } from '../../shared/contracts'

export default async function getTabsSnapshotQuery(
    _: GetTabsSnapshotPayload = {},
): Promise<GetTabsSnapshotResult> {
    const stateData = await stateRepository.loadState()
    const tabs = await TabsService.getAllTabs()
    const tabsModel = buildTabsModel(tabs, stateData)

    return { tabsModel }
}