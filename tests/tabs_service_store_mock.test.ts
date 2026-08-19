import { describe, expect, it, vi } from 'vitest'

vi.unmock('/js/tabs_service.ts')
vi.unmock('/js/infra/repositories/tab_value_store.ts')

describe('tabs_service store mocking', () => {
    it('reads timestamp data via the injected store', async () => {
        vi.resetModules()

        globalThis.browser = {
            sessions: {
                getTabValue: vi.fn(),
                setTabValue: vi.fn(),
            },
            tabs: {
                query: vi.fn().mockResolvedValue([{ id: 10, url: 'https://a.test', windowId: 1, index: 0 }]),
            },
            storage: {
                local: {
                    get: vi.fn().mockResolvedValue({}),
                    set: vi.fn().mockResolvedValue(undefined),
                },
            },
        } as any

        const { default: tabValueStore } = await import('/js/infra/repositories/tab_value_store.ts')
        vi.spyOn(tabValueStore, 'getTabValue').mockResolvedValue({
            lastSeenAt: 100,
            lastContentChangeAt: 90,
            lastUsedAt: 100,
            lastUsedReason: 'activated',
            lastEventAt: 100,
        })

        const { default: tabsService } = await import('/js/tabs_service.ts')
        const tabs = await tabsService.getAllTabs()

        expect(tabValueStore.getTabValue).toHaveBeenCalledWith(10, 'timestamps')
        expect(tabs[0].timeValue).toBe(100)
    })
})
