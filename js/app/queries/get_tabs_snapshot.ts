import TabsService from '../../tabs_service.ts'
import stateRepository from '../../infra/repositories/state_repository'
import buildTabsViewModel from '../../ui/presenters/tabs_presenter.ts'
import type { GetTabsSnapshotPayload, GetTabsSnapshotResult } from '../../shared/contracts'

export default async function getTabsSnapshotQuery(
    payload: GetTabsSnapshotPayload = {},
): Promise<GetTabsSnapshotResult> {
    const stateData = await stateRepository.loadState()
    const tabs = await TabsService.getAllTabs()
    const activeFilters = payload?.activeFilters && typeof payload.activeFilters === 'object'
        ? payload.activeFilters
        : {}
    const viewModel = buildTabsViewModel(tabs, stateData, activeFilters)

    return { viewModel }
}