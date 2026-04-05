import { describe, expect, it, vi } from 'vitest'

const { enrichTabsSpy } = vi.hoisted(() => ({
    enrichTabsSpy: vi.fn(),
}))

vi.mock('/js/state_service.js', () => ({
    default: {
        enrichTabs: (...args) => enrichTabsSpy(...args),
    },
}))

import buildTabsViewModel from '/js/ui/presenters/tabs_presenter.js'

describe('tabs presenter', () => {
    it('calls enrichTabs and builds grouped view model with sorted subgroup tabs', () => {
        const tabs = [
            { id: 1, url: 'https://b.example/path', pinned: false, windowId: 2 },
            { id: 2, url: 'https://a.example/path', pinned: true, windowId: 2 },
            { id: 3, url: 'https://other.example/path', pinned: false, windowId: 5 },
        ]

        enrichTabsSpy.mockImplementation((tabList) => {
            tabList[0].filtered = true
            tabList[1].filtered = true
            tabList[2].filtered = false
        })

        const state = {
            isLocked: vi.fn((url) => url.includes('locked')),
            applyGrouping: vi.fn(() => [
                ['Work', 'Others'],
                { Work: ['example.com'], Others: ['other.example'] },
                {
                    'example.com': [tabs[0], tabs[1]],
                    'other.example': [tabs[2]],
                },
            ]),
        }

        const viewModel = buildTabsViewModel(tabs, state)

        expect(enrichTabsSpy).toHaveBeenCalledWith(tabs, state, {})
        expect(viewModel.groups).toHaveLength(2)
        expect(viewModel.groups[0]).toMatchObject({
            name: 'Work',
            info: '1/2',
            isOthers: false,
        })
        expect(viewModel.groups[0].subgroups).toHaveLength(1)
        expect(viewModel.groups[0].subgroups[0].name).toBe('example.com')
        expect(viewModel.groups[0].subgroups[0].items.map((t) => t.url)).toEqual([
            'https://a.example/path',
            'https://b.example/path',
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

        const state = {
            isLocked: vi.fn().mockReturnValue(false),
            applyGrouping: vi.fn(() => [
                ['Work'],
                { Work: ['example.com'] },
                { 'example.com': tabs },
            ]),
        }

        const viewModel = buildTabsViewModel(tabs, state)

        expect(tabs[0].windowColor).toBe(tabs[2].windowColor)
        expect(tabs[0].windowColor).not.toBe(tabs[1].windowColor)
        expect(viewModel.windows.map((w) => w.id)).toEqual([3, 9])
        expect(viewModel.windows.find((w) => w.id === 9)?.tabCount).toBe(2)
    })
})
