import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('/js/domain/tab_enrichment.ts')

async function loadTabEnrichmentWithGlobals() {
    vi.resetModules()

    const tabEnrichmentModule = await import('/js/domain/tab_enrichment.ts')
    return tabEnrichmentModule.enrichTabs
}

describe('tab_enrichment runtime guard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('initializes dayjs runtime and enriches tabs', async () => {
        const enrichTabs = await loadTabEnrichmentWithGlobals()

        const tabs = [
            {
                id: 1,
                url: 'https://example.com/path#hash',
                lastAccessed: Date.now() - 1000,
            },
        ]

        expect(() => enrichTabs(tabs, () => false)).not.toThrow()
        expect(tabs[0].lastAccessedFriendly).toBeTypeOf('string')
        expect(tabs[0].lastAccessedString).toBeTypeOf('string')
        expect(tabs[0].dayFilter).toBe('today')
    })

    it('uses tab.timeValue when present', async () => {
        const enrichTabs = await loadTabEnrichmentWithGlobals()
        const tabs = [
            {
                id: 2,
                url: 'https://example.org',
                lastAccessed: 1700000000000,
                timeValue: 1700000000000,
            },
        ]

        enrichTabs(tabs, () => false)

        expect(tabs[0].lastAccessedColor).toBe('black')
        expect(tabs[0].lastAccessedFriendly).toBeTypeOf('string')
        expect(tabs[0].lastAccessedString).toBeTypeOf('string')
    })
})
