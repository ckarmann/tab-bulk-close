import { describe, expect, it, vi } from 'vitest'

const { enrichTabsSpy } = vi.hoisted(() => ({
    enrichTabsSpy: vi.fn(),
}))

vi.mock('/js/domain/tab_enrichment.js', () => ({
    enrichTabs: (...args) => enrichTabsSpy(...args),
}))

import buildTabsViewModel from '/js/ui/presenters/tabs_presenter.js'

describe('tabs presenter', () => {
    it('calls enrichTabs and builds grouped view model with sorted subgroup tabs', () => {
        const tabs = [
            { id: 1, url: 'https://example.com/b-path', pinned: false, windowId: 2 },
            { id: 2, url: 'https://example.com/a-path', pinned: true, windowId: 2 },
            { id: 3, url: 'https://other.example/path', pinned: false, windowId: 5 },
        ]

        enrichTabsSpy.mockImplementation((tabList) => {
            tabList[0].filtered = true
            tabList[1].filtered = true
            tabList[2].filtered = false
        })

        const stateData = {
            groups: ['Work', 'Others'],
            mapping: {
                'example.com': 'Work',
            },
            lockedUrls: ['https://locked.example'],
        }

        const viewModel = buildTabsViewModel(tabs, stateData)

        expect(enrichTabsSpy).toHaveBeenCalledWith(tabs, expect.any(Function), {})
        expect(viewModel.groups).toHaveLength(2)
        expect(viewModel.groups[0]).toMatchObject({
            name: 'Work',
            info: '1/2',
            isOthers: false,
        })
        expect(viewModel.groups[0].subgroups).toHaveLength(1)
        expect(viewModel.groups[0].subgroups[0].name).toBe('example.com')
        expect(viewModel.groups[0].subgroups[0].items.map((t) => t.url)).toEqual([
            'https://example.com/a-path',
            'https://example.com/b-path',
        ])
        expect(viewModel.groups[1].subgroups).toHaveLength(0)
    })

    it('keeps window color stable per window and returns windows sorted by id', () => {
        const tabs = [
            { id: 10, url: 'https://a.example', pinned: false, windowId: 9 },
            { id: 11, url: 'https://b.example', pinned: false, windowId: 3 },
            { id: 12, url: 'https://c.example', pinned: false, windowId: 9 },
        ]

        enrichTabsSpy.mockImplementation((tabList) => {
            for (const tab of tabList) {
                tab.filtered = true
            }
        })

        const stateData = {
            groups: ['Work'],
            mapping: {
                'a.example': 'Work',
                'b.example': 'Work',
                'c.example': 'Work',
            },
            lockedUrls: [],
        }

        const viewModel = buildTabsViewModel(tabs, stateData)

        expect(tabs[0].windowColor).toBe(tabs[2].windowColor)
        expect(tabs[0].windowColor).not.toBe(tabs[1].windowColor)
        expect(viewModel.windows.map((w) => w.id)).toEqual([3, 9])
        expect(viewModel.windows.find((w) => w.id === 9)?.tabCount).toBe(2)
    })
})
