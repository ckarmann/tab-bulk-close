import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFilterStateSpy } = vi.hoisted(() => ({
    applyFilterStateSpy: vi.fn(),
}))

vi.mock('/js/filters.js', () => ({
    default: {
        applyFilterState: (...args) => applyFilterStateSpy(...args),
    },
}))

import renderTabsView from '/js/ui/renderers/tabs_renderer.js'

describe('tabs renderer', () => {
    beforeEach(() => {
        applyFilterStateSpy.mockReset()
    })

    it('renders templates into containers and reapplies filter state', () => {
        const elements = {
            'group-template': { innerHTML: 'GROUP_TEMPLATE' },
            'group-shortcut-template': { innerHTML: 'SHORTCUT_TEMPLATE' },
            'window-filter-template': { innerHTML: 'WINDOW_TEMPLATE' },
            'tab-groups': { innerHTML: '' },
            'drop-groups-shortcuts': { innerHTML: '' },
            'filter-windows': { innerHTML: '' },
        }

        globalThis.document = {
            getElementById: (id) => elements[id],
        }

        const renderSpy = vi.fn((template, data) => `${template}:${JSON.stringify(data)}`)
        globalThis.Mustache = {
            render: renderSpy,
        }

        const viewModel = {
            groups: [{ name: 'Work' }],
            windows: [{ id: 3, tabCount: 2 }],
        }

        renderTabsView(viewModel)

        expect(renderSpy).toHaveBeenNthCalledWith(1, 'GROUP_TEMPLATE', { groups: viewModel.groups })
        expect(renderSpy).toHaveBeenNthCalledWith(2, 'SHORTCUT_TEMPLATE', { groups: viewModel.groups })
        expect(renderSpy).toHaveBeenNthCalledWith(3, 'WINDOW_TEMPLATE', { windows: viewModel.windows })
        expect(elements['tab-groups'].innerHTML).toContain('GROUP_TEMPLATE')
        expect(elements['drop-groups-shortcuts'].innerHTML).toContain('SHORTCUT_TEMPLATE')
        expect(elements['filter-windows'].innerHTML).toContain('WINDOW_TEMPLATE')
        expect(applyFilterStateSpy).toHaveBeenCalledTimes(1)
        expect(applyFilterStateSpy).toHaveBeenCalledWith(elements['filter-windows'])
    })
})
