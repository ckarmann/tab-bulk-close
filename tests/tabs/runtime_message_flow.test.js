import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    setDirtyAndRefreshSpy,
    refreshNowSpy,
    filtersInitSpy,
    tabsServiceSetValueSpy,
} = vi.hoisted(() => ({
    setDirtyAndRefreshSpy: vi.fn(),
    refreshNowSpy: vi.fn(),
    filtersInitSpy: vi.fn(),
    tabsServiceSetValueSpy: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('/tabs/tabs_view.js', () => ({
    setDirtyAndRefresh: (...args) => setDirtyAndRefreshSpy(...args),
    refreshNow: (...args) => refreshNowSpy(...args),
}))

vi.mock('/js/state_service.js', () => ({ default: {} }))
vi.mock('/js/tabs_service.js', () => ({
    default: {
        getAllTabs: vi.fn().mockResolvedValue([]),
        setTabValue: (...args) => tabsServiceSetValueSpy(...args),
    },
}))
vi.mock('/js/filters.js', () => ({
    default: {
        init: (...args) => filtersInitSpy(...args),
    },
}))
vi.mock('/js/app/commands/add_group.js', () => ({ default: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock('/js/app/commands/ungroup.js', () => ({ default: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock('/js/app/commands/move_domain.js', () => ({ default: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock('/js/app/commands/toggle_lock.js', () => ({ default: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock('/js/app/commands/close_group.js', () => ({ default: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock('/js/app/commands/extract_group.js', () => ({ default: vi.fn().mockResolvedValue({ ok: true }) }))

async function loadTabsAndCaptureMessageListener() {
    vi.resetModules()

    setDirtyAndRefreshSpy.mockReset()
    refreshNowSpy.mockReset()
    filtersInitSpy.mockReset()

    const runtimeMessageListeners = []
    const linkElement = {
        textContent: 'Old title',
        scrollIntoView: vi.fn(),
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn().mockReturnValue(false),
        },
    }
    const querySelectorSpy = vi.fn(() => linkElement)

    globalThis.document = {
        addEventListener: vi.fn(),
        getElementById: vi.fn(() => ({
            value: '',
            innerHTML: '',
            classList: {
                contains: vi.fn().mockReturnValue(false),
                add: vi.fn(),
                remove: vi.fn(),
            },
        })),
        querySelector: querySelectorSpy,
        querySelectorAll: vi.fn().mockReturnValue([]),
        body: {
            classList: {
                contains: vi.fn().mockReturnValue(false),
                add: vi.fn(),
                remove: vi.fn(),
            },
        },
    }

    globalThis.browser = {
        runtime: {
            onMessage: {
                addListener: vi.fn((listener) => {
                    runtimeMessageListeners.push(listener)
                }),
            },
        },
        windows: {
            onFocusChanged: { addListener: vi.fn() },
            update: vi.fn(),
        },
        tabs: {
            onCreated: { addListener: vi.fn() },
            onRemoved: { addListener: vi.fn() },
            onActivated: { addListener: vi.fn() },
            onUpdated: { addListener: vi.fn() },
            query: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue({ id: 1, windowId: 1 }),
            update: vi.fn(),
            remove: vi.fn(),
        },
    }

    await import('/tabs/tabs.js')

    expect(runtimeMessageListeners).toHaveLength(1)
    return {
        listener: runtimeMessageListeners[0],
        querySelectorSpy,
        linkElement,
    }
}

describe('tabs runtime message flow', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('refreshes page when receiving state_changed for tab_created', async () => {
        const { listener } = await loadTabsAndCaptureMessageListener()

        listener({ type: 'state_changed', payload: { reason: 'tab_created' } })

        expect(setDirtyAndRefreshSpy).toHaveBeenCalledWith(250)
    })

    it('refreshes page when receiving state_changed for tab_removed', async () => {
        const { listener } = await loadTabsAndCaptureMessageListener()

        listener({ type: 'state_changed', payload: { reason: 'tab_removed' } })

        expect(setDirtyAndRefreshSpy).toHaveBeenCalledWith(250)
    })

    it('does not refresh for unrelated messages', async () => {
        const { listener } = await loadTabsAndCaptureMessageListener()

        listener({ type: 'state_changed', payload: { reason: 'tab_updated' } })
        listener({ type: 'other_event', payload: { reason: 'tab_created' } })
        listener(null)

        expect(setDirtyAndRefreshSpy).not.toHaveBeenCalled()
    })

    it('updates displayed tab title when receiving tab_updated_title', async () => {
        const { listener, querySelectorSpy, linkElement } = await loadTabsAndCaptureMessageListener()

        listener({
            type: 'state_changed',
            payload: {
                reason: 'tab_updated_title',
                changedTabIds: [123],
                title: 'New tab title',
            },
        })

        expect(querySelectorSpy).toHaveBeenCalledWith(".switch-tabs[data-tab-id='123']")
        expect(linkElement.textContent).toBe('New tab title')
        expect(refreshNowSpy).not.toHaveBeenCalled()
    })

    it('does not throw when tab_updated_title target element is missing', async () => {
        const { listener, querySelectorSpy } = await loadTabsAndCaptureMessageListener()
        querySelectorSpy.mockReturnValueOnce(null)

        expect(() => {
            listener({
                type: 'state_changed',
                payload: {
                    reason: 'tab_updated_title',
                    changedTabIds: [456],
                    title: 'Ignored title',
                },
            })
        }).not.toThrow()

        expect(refreshNowSpy).not.toHaveBeenCalled()
    })
})
