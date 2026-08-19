import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('tab_value_store', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()

        globalThis.browser = {
            sessions: {
                getTabValue: vi.fn(),
                setTabValue: vi.fn(),
            },
            tabs: {
                query: vi.fn().mockResolvedValue([]),
                get: vi.fn(),
                onCreated: { addListener: vi.fn() },
                onUpdated: { addListener: vi.fn() },
                onMoved: { addListener: vi.fn() },
                onDetached: { addListener: vi.fn() },
                onAttached: { addListener: vi.fn() },
                onRemoved: { addListener: vi.fn() },
            },
            storage: {
                local: {
                    get: vi.fn().mockResolvedValue({}),
                    set: vi.fn().mockResolvedValue(undefined),
                },
            },
        } as any
    })

    it('delegates get/set/remove to native sessions api when available', async () => {
        const store = (await import('/js/infra/repositories/tab_value_store.ts')).default

        browser.sessions.getTabValue.mockResolvedValue('existing-value')
        browser.sessions.setTabValue.mockResolvedValue(undefined)
        browser.sessions.removeTabValue = vi.fn().mockResolvedValue(undefined)

        await expect(store.getTabValue(10, 'feature')).resolves.toBe('existing-value')
        await store.setTabValue(10, 'feature', { ok: true })
        await store.removeTabValue(10, 'feature')

        expect(browser.sessions.getTabValue).toHaveBeenCalledWith(10, 'feature')
        expect(browser.sessions.setTabValue).toHaveBeenCalledWith(10, 'feature', { ok: true })
        expect(browser.sessions.removeTabValue).toHaveBeenCalledWith(10, 'feature')
    })

    it('clears all values tracked for a tab via native removeTabValue when available', async () => {
        const store = (await import('/js/infra/repositories/tab_value_store.ts')).default

        browser.sessions.setTabValue.mockResolvedValue(undefined)
        browser.sessions.removeTabValue = vi.fn().mockResolvedValue(undefined)

        await store.setTabValue(10, 'alpha', 'first')
        await store.setTabValue(10, 'beta', 'second')
        await store.clearTabValues(10)

        expect(browser.sessions.removeTabValue).toHaveBeenCalledWith(10, 'alpha')
        expect(browser.sessions.removeTabValue).toHaveBeenCalledWith(10, 'beta')
        expect(browser.sessions.removeTabValue).toHaveBeenCalledTimes(2)
    })

    it('falls back to setTabValue(undefined) for remove when native removeTabValue is unavailable', async () => {
        const store = (await import('/js/infra/repositories/tab_value_store.ts')).default

        browser.sessions.setTabValue.mockResolvedValue(undefined)
        browser.sessions.removeTabValue = undefined

        await store.setTabValue(10, 'alpha', 'first')
        await store.removeTabValue(10, 'alpha')

        expect(browser.sessions.setTabValue).toHaveBeenCalledWith(10, 'alpha', undefined)
    })

    it('uses the registry fallback for storage-backed remove and clear operations', async () => {
        browser.sessions.getTabValue = undefined
        browser.sessions.setTabValue = undefined
        browser.tabs.get = vi.fn().mockResolvedValue({
            id: 7,
            url: 'https://example.test',
            index: 0,
            windowId: 1,
            lastAccessed: 123,
        })

        const store = (await import('/js/infra/repositories/tab_value_store.ts')).default

        await store.setTabValue(7, 'alpha', 'first')
        await store.setTabValue(7, 'beta', 'second')
        await store.removeTabValue(7, 'alpha')
        await store.clearTabValues(7)

        expect(browser.storage.local.set).toHaveBeenCalledWith({
            TabRegistry: {
                'tabState-7': {
                    tabId: 7,
                    url: 'https://example.test',
                    windowId: 1,
                    lastAccessed: 123,
                    index: 0,
                    dict: {},
                },
            },
        })
    })
})
