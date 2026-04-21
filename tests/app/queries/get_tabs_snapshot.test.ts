import { describe, expect, it, vi, beforeEach } from 'vitest'

const { loadStateSpy, getAllTabsSpy, buildTabsModelSpy } = vi.hoisted(() => ({
    loadStateSpy: vi.fn(),
    getAllTabsSpy: vi.fn(),
    buildTabsModelSpy: vi.fn(),
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

vi.mock('/js/domain/tab_grouping.ts', () => ({
    buildTabsModel: (...args) => buildTabsModelSpy(...args),
}))

import getTabsSnapshotQuery from '/js/app/queries/get_tabs_snapshot.ts'

describe('get_tabs_snapshot query', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads state from repository and builds tabs model', async () => {
        const stateData = {
            groups: ['Work', 'Others'],
            mapping: { 'example.com': 'Work' },
            lockedUrls: ['https://example.com/a'],
        }
        const tabs = [{ id: 1, url: 'https://example.com/a' }]
        const tabsModel = { groups: [], windows: [] }

        loadStateSpy.mockResolvedValue(stateData)
        getAllTabsSpy.mockResolvedValue(tabs)
        buildTabsModelSpy.mockReturnValue(tabsModel)

        const result = await getTabsSnapshotQuery({})

        expect(loadStateSpy).toHaveBeenCalledTimes(1)
        expect(getAllTabsSpy).toHaveBeenCalledTimes(1)
        expect(buildTabsModelSpy).toHaveBeenCalledWith(tabs, stateData)
        expect(result).toEqual({ tabsModel })
    })

    it('ignores payload content and still builds tabs model', async () => {
        const stateData = {
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        }
        const tabs = [{ id: 1, url: 'https://example.com' }]
        const tabsModel = { groups: [], windows: [] }

        loadStateSpy.mockResolvedValue(stateData)
        getAllTabsSpy.mockResolvedValue(tabs)
        buildTabsModelSpy.mockReturnValue(tabsModel)

        const result = await getTabsSnapshotQuery({ anything: 'ignored' } as any)

        expect(buildTabsModelSpy).toHaveBeenCalledWith(tabs, stateData)
        expect(result).toEqual({ tabsModel })
    })
})
