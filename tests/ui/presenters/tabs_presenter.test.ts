import { describe, expect, it, vi } from 'vitest'
import buildTabsView from '/js/ui/presenters/tabs_presenter.ts'

describe('tabs presenter', () => {
    it('applies active filters and computes group info from visible tabs', () => {
        const tabsModel = {
            groups: [
                {
                    name: 'Work',
                    id: 'Work',
                    tabCount: 3,
                    isOthers: false,
                    subgroups: [
                        {
                            name: 'example.com',
                            id: 'example.com',
                            items: [
                                { id: 1, url: 'https://example.com/b', pinned: false, locked: false, windowId: 2 },
                                { id: 2, url: 'https://example.com/a', pinned: true, locked: false, windowId: 2 },
                            ],
                        },
                        {
                            name: 'other.example',
                            id: 'other.example',
                            items: [
                                { id: 3, url: 'https://other.example/z', pinned: false, locked: false, windowId: 5 },
                            ],
                        },
                    ],
                },
                {
                    name: 'Others',
                    id: 'Others',
                    tabCount: 1,
                    isOthers: true,
                    subgroups: [
                        {
                            name: 'misc.example',
                            id: 'misc.example',
                            items: [
                                { id: 4, url: 'https://misc.example/1', pinned: false, locked: false, windowId: 5 },
                            ],
                        },
                    ],
                },
            ],
            windows: [
                { id: 2, tabCount: 2 },
                { id: 5, tabCount: 2 },
            ],
        }

        const activeFilters = {
            'filter-window': {
                attributes: 'windowId',
                check: null,
                filterValue: 2,
            },
        }

        const viewModel = buildTabsView(tabsModel, activeFilters)

        expect(viewModel.groups).toHaveLength(2)
        expect(viewModel.groups[0]).toMatchObject({
            name: 'Work',
            info: '1/3',
            isOthers: false,
        })
        expect(viewModel.groups[0].subgroups).toHaveLength(1)
        expect(viewModel.groups[0].subgroups[0].name).toBe('example.com')
        expect(viewModel.groups[0].subgroups[0].items.map((t) => t.url)).toEqual([
            'https://example.com/a',
            'https://example.com/b',
        ])
        expect(viewModel.groups[1].info).toBe('0/1')
        expect(viewModel.groups[1].subgroups).toHaveLength(0)
    })

    it('keeps window color stable per window and returns windows sorted by id', () => {
        const tabsModel = {
            groups: [
                {
                    name: 'Work',
                    id: 'Work',
                    tabCount: 3,
                    isOthers: false,
                    subgroups: [
                        {
                            name: 'example.com',
                            id: 'example.com',
                            items: [
                                { id: 10, url: 'https://a.example', pinned: false, locked: false, windowId: 9 },
                                { id: 11, url: 'https://b.example', pinned: false, locked: false, windowId: 3 },
                                { id: 12, url: 'https://c.example', pinned: false, locked: false, windowId: 9 },
                            ],
                        },
                    ],
                },
            ],
            windows: [
                { id: 9, tabCount: 2 },
                { id: 3, tabCount: 1 },
            ],
        }

        const viewModel = buildTabsView(tabsModel, {})
        const groupTabs = viewModel.groups[0].subgroups[0].items

        expect(groupTabs.find((t) => t.id === 10)?.windowColor).toBe(groupTabs.find((t) => t.id === 12)?.windowColor)
        expect(groupTabs.find((t) => t.id === 10)?.windowColor).not.toBe(groupTabs.find((t) => t.id === 11)?.windowColor)
        expect(viewModel.windows.map((w) => w.id)).toEqual([3, 9])
        expect(viewModel.windows.find((w) => w.id === 9)?.tabCount).toBe(2)
    })
})
