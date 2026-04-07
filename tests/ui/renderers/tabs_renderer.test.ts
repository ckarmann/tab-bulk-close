import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFilterStateSpy, mustacheRenderSpy } = vi.hoisted(() => ({
    applyFilterStateSpy: vi.fn(),
    mustacheRenderSpy: vi.fn((template, data) => `${template}:${JSON.stringify(data)}`),
}))

vi.mock('/js/filters.ts', () => ({
    default: {
        applyFilterState: (...args) => applyFilterStateSpy(...args),
    },
}))

vi.mock('mustache', () => ({
    default: {
        render: (...args) => mustacheRenderSpy(...args),
    },
}))

import renderTabsView from '/js/ui/renderers/tabs_renderer.ts'
import groupTemplate from '/js/ui/templates/group-template.mustache?raw'
import shortcutTemplate from '/js/ui/templates/group-shortcut-template.mustache?raw'
import windowFilterTemplate from '/js/ui/templates/window-filter-template.mustache?raw'

describe('tabs renderer', () => {
    beforeEach(() => {
        applyFilterStateSpy.mockReset()
        mustacheRenderSpy.mockReset()
        mustacheRenderSpy.mockImplementation((template, data) => `${template}:${JSON.stringify(data)}`)
    })

    it('renders templates into containers and reapplies filter state', () => {
        const elements = {
            'tab-groups': { innerHTML: '' },
            'drop-groups-shortcuts': { innerHTML: '' },
            'filter-windows': { innerHTML: '' },
        }

        globalThis.document = {
            getElementById: (id) => elements[id],
        }

        const viewModel = {
            groups: [{ name: 'Work' }],
            windows: [{ id: 3, tabCount: 2 }],
        }

        renderTabsView(viewModel)

        expect(mustacheRenderSpy).toHaveBeenNthCalledWith(1, groupTemplate, { groups: viewModel.groups })
        expect(mustacheRenderSpy).toHaveBeenNthCalledWith(2, shortcutTemplate, { groups: viewModel.groups })
        expect(mustacheRenderSpy).toHaveBeenNthCalledWith(3, windowFilterTemplate, { windows: viewModel.windows })
        expect(elements['tab-groups'].innerHTML).toContain('groups')
        expect(elements['drop-groups-shortcuts'].innerHTML).toContain('groups')
        expect(elements['filter-windows'].innerHTML).toContain('windows')
        expect(applyFilterStateSpy).toHaveBeenCalledTimes(1)
        expect(applyFilterStateSpy).toHaveBeenCalledWith(elements['filter-windows'])
    })
})
