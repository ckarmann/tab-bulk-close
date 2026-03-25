import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('/js/state_service.js')

vi.mock('/js/filters.js', () => ({
    default: {
        filter: vi.fn(() => true),
    },
}))

async function loadStateServiceWithGlobals() {
    vi.resetModules()

    const module = await import('/js/state_service.js')
    return module.default
}

describe('state_service runtime guard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        delete globalThis.dayjs
        delete globalThis.dayjs_plugin_relativeTime
    })

    it('initializes dayjs globals and enriches tabs', async () => {
        const stateService = await loadStateServiceWithGlobals()
        expect(typeof globalThis.dayjs).toBe('function')
        expect(typeof globalThis.dayjs_plugin_relativeTime).toBe('function')

        const state = new stateService.State(['Others'], {}, [])
        const tabs = [
            {
                id: 1,
                url: 'https://example.com/path#hash',
                lastAccessed: Date.now() - 1000,
            },
        ]

        expect(() => stateService.enrichTabs(tabs, state)).not.toThrow()
        expect(tabs[0].lastAccessedFriendly).toBeTypeOf('string')
        expect(tabs[0].lastAccessedString).toBeTypeOf('string')
        expect(tabs[0].dayFilter).toBe('today')
    })

    it('uses tab.timeValue when present', async () => {
        const stateService = await loadStateServiceWithGlobals()
        const state = new stateService.State(['Others'], {}, [])
        const tabs = [
            {
                id: 2,
                url: 'https://example.org',
                lastAccessed: 1700000000000,
                timeValue: 1700000000000,
            },
        ]

        stateService.enrichTabs(tabs, state)

        expect(tabs[0].lastAccessedColor).toBe('black')
        expect(tabs[0].lastAccessedFriendly).toBeTypeOf('string')
        expect(tabs[0].lastAccessedString).toBeTypeOf('string')
    })
})
