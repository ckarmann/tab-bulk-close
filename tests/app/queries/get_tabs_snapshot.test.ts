import { describe, expect, it, vi, beforeEach } from 'vitest'

const { loadStateSpy, getAllTabsSpy, buildTabsViewModelSpy } = vi.hoisted(() => ({
    loadStateSpy: vi.fn(),
    getAllTabsSpy: vi.fn(),
    buildTabsViewModelSpy: vi.fn(),
}))

vi.mock('/js/infra/repositories/state_repository.ts', () => ({
    default: {
        loadState: (...args) => loadStateSpy(...args),
    },
}))

vi.mock('/js/tabs_service.ts', () => ({
    default: {
        getAllTabs: (...args) => getAllTabsSpy(...args),
    },
}))

vi.mock('/js/ui/presenters/tabs_presenter.ts', () => ({
    default: (...args) => buildTabsViewModelSpy(...args),
}))

import getTabsSnapshotQuery from '/js/app/queries/get_tabs_snapshot.ts'

describe('get_tabs_snapshot query', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads state from repository and builds a view model with activeFilters', async () => {
        const stateData = {
            groups: ['Work', 'Others'],
            mapping: { 'example.com': 'Work' },
            lockedUrls: ['https://example.com/a'],
        }
        const tabs = [{ id: 1, url: 'https://example.com/a' }]
        const activeFilters = {
            'filter-duplicates': {
                attributes: 'duplicate',
                check: null,
                filterValue: null,
            },
        }
        const viewModel = { groups: [], windows: [] }

        loadStateSpy.mockResolvedValue(stateData)
        getAllTabsSpy.mockResolvedValue(tabs)
        buildTabsViewModelSpy.mockReturnValue(viewModel)

        const result = await getTabsSnapshotQuery({ activeFilters })

        expect(loadStateSpy).toHaveBeenCalledTimes(1)
        expect(getAllTabsSpy).toHaveBeenCalledTimes(1)
        expect(buildTabsViewModelSpy).toHaveBeenCalledWith(tabs, stateData, activeFilters)
        expect(result).toEqual({ viewModel })
    })

    it('defaults activeFilters to an empty object when payload is invalid', async () => {
        const stateData = {
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        }
        const tabs = [{ id: 1, url: 'https://example.com' }]

        loadStateSpy.mockResolvedValue(stateData)
        getAllTabsSpy.mockResolvedValue(tabs)
        buildTabsViewModelSpy.mockReturnValue({ groups: [], windows: [] })

        await getTabsSnapshotQuery({ activeFilters: 'bad' })

        expect(buildTabsViewModelSpy).toHaveBeenCalledWith(tabs, stateData, {})
    })
})
