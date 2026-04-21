import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('/js/filters.ts')
vi.mock('/js/shared/filter_state.ts', () => ({
    matchesActiveFilters: vi.fn(() => true),
}))

import Filters from '/js/filters.ts'
import { matchesActiveFilters } from '/js/shared/filter_state.ts'

describe('filters module', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        Filters.state = {}
    })

    it('delegates filter(object) to shared matchesActiveFilters', () => {
        const tab = { id: 1, pinned: false }
        const state = { 'filter-pinned': { attributes: 'pinned', check: null, filterValue: null } }
        Filters.state = state

        const result = Filters.filter(tab)

        expect(result).toBe(true)
        expect(matchesActiveFilters).toHaveBeenCalledWith(tab, state)
    })

    it('applies active state to matching filter button', () => {
        const button = {
            getAttribute: vi.fn((name) => {
                if (name === 'attributes') return 'duplicate'
                if (name === 'check') return null
                if (name === 'filter-value') return null
                return null
            }),
            classList: {
                add: vi.fn(),
                remove: vi.fn(),
            },
        }

        const control = {
            id: 'filter-duplicates',
            querySelectorAll: vi.fn(() => [button]),
            querySelector: vi.fn(() => null),
        }

        Filters.state['filter-duplicates'] = {
            attributes: 'duplicate',
            check: null,
            filterValue: null,
        }

        Filters.applyFilterState(control)

        expect(control.querySelectorAll).toHaveBeenCalledWith('filter-button')
        expect(button.classList.add).toHaveBeenCalledWith('filter-on')
    })

    it('registers click handler and toggles a filter button', () => {
        const refresh = vi.fn()
        const addEventListener = vi.fn()
        globalThis.document = { addEventListener }

        Filters.init(refresh)

        const clickHandler = addEventListener.mock.calls.find(([eventName]) => eventName === 'click')?.[1]
        expect(typeof clickHandler).toBe('function')

        const classList = {
            contains: vi.fn(() => false),
            add: vi.fn(),
            remove: vi.fn(),
        }

        const target = {
            tagName: 'FILTER-BUTTON',
            getAttribute: vi.fn((name) => {
                if (name === 'attributes') return 'locked'
                if (name === 'check') return null
                if (name === 'filter-value') return null
                return null
            }),
            outerHTML: '<filter-button attributes="locked"></filter-button>',
            classList,
            closest: vi.fn((selector) => {
                if (selector === 'filter-control') {
                    return {
                        id: 'filter-pinned',
                        querySelector: vi.fn(() => null),
                    }
                }
                return null
            }),
        }

        const event = {
            target,
            preventDefault: vi.fn(),
        }

        clickHandler(event)

        expect(classList.add).toHaveBeenCalledWith('filter-on')
        expect(Filters.state['filter-pinned']).toEqual({
            attributes: 'locked',
            check: null,
            filterValue: null,
        })
        expect(refresh).toHaveBeenCalled()
        expect(event.preventDefault).toHaveBeenCalled()
    })
})
