import TabsService from '/js/tabs_service.js'
import StateService from '/js/state_service.js'
import buildTabsViewModel from '/js/ui/presenters/tabs_presenter.js'

export default async function getTabsSnapshotQuery(payload = {}) {
    const state = await StateService.loadState()
    const tabs = await TabsService.getAllTabs()
    const activeFilters = payload?.activeFilters && typeof payload.activeFilters === 'object'
        ? payload.activeFilters
        : {}
    const viewModel = buildTabsViewModel(tabs, state, activeFilters)

    return { viewModel }
}
