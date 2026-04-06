import TabsService from '/js/tabs_service.js'
import stateRepository from '/js/infra/repositories/state_repository.js'
import buildTabsViewModel from '/js/ui/presenters/tabs_presenter.js'

export default async function getTabsSnapshotQuery(payload = {}) {
    const stateData = await stateRepository.loadState()
    const tabs = await TabsService.getAllTabs()
    const activeFilters = payload?.activeFilters && typeof payload.activeFilters === 'object'
        ? payload.activeFilters
        : {}
    const viewModel = buildTabsViewModel(tabs, stateData, activeFilters)

    return { viewModel }
}
