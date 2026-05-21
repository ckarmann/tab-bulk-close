import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TabTimestampsModel } from '/js/shared/contracts.ts'

const { getTabValueSpy, setTabValueSpy, tabsGetSpy } = vi.hoisted(() => ({
    getTabValueSpy: vi.fn(),
    setTabValueSpy: vi.fn(),
    tabsGetSpy: vi.fn(),
}))

vi.mock('/js/tabs_service.ts', () => ({
    default: {
        getTabValue: getTabValueSpy,
        setTabValue: setTabValueSpy,
        getAllTabs: vi.fn(),
    },
}))

async function loadTouchTab() {
    vi.resetModules()

    globalThis.browser = {
        runtime: {
            getURL: vi.fn(() => 'moz-extension://id/tabs.html'),
            sendMessage: vi.fn().mockResolvedValue(undefined),
            onMessage: { addListener: vi.fn() },
        },
        action: { onClicked: { addListener: vi.fn() } },
        tabs: {
            onCreated: { addListener: vi.fn() },
            onRemoved: { addListener: vi.fn() },
            onActivated: { addListener: vi.fn() },
            onUpdated: { addListener: vi.fn() },
            query: vi.fn().mockResolvedValue([]),
            get: (...args: any[]) => tabsGetSpy(...args),
            update: vi.fn(),
            create: vi.fn(),
        },
        windows: {
            update: vi.fn(),
            onFocusChanged: { addListener: vi.fn() },
        },
        sessions: {
            getTabValue: vi.fn(),
            setTabValue: vi.fn().mockResolvedValue(undefined),
        },
        storage: {
            local: {
                get: vi.fn().mockResolvedValue({}),
                set: vi.fn().mockResolvedValue(undefined),
            },
        },
    }

    const { touchTab } = await import('/js/background.ts')
    return touchTab
}

const BASE_TS: TabTimestampsModel = {
    lastSeenAt: 1000,
    lastContentChangeAt: 900,
    lastUsedAt: 1000,
    lastUsedReason: 'activated',
    lastEventAt: 1000,
}

describe('touchTab', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(2000)
        tabsGetSpy.mockReset()
        tabsGetSpy.mockResolvedValue({ id: 42 })
        setTabValueSpy.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('initializes timestamps from tab.lastAccessed when available', async () => {
        getTabValueSpy.mockResolvedValue(undefined)
        tabsGetSpy.mockResolvedValue({ id: 42, lastAccessed: 1500 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'activated')

        expect(tabsGetSpy).toHaveBeenCalledWith(42)
        expect(setTabValueSpy).toHaveBeenCalledWith(42, 'timestamps', {
            lastSeenAt: 1500,
            lastContentChangeAt: 1500,
            lastUsedAt: 1500,
            lastUsedReason: 'fallback_lastAccessed',
            lastEventAt: 2000,
        })
    })

    it('initializes timestamps with Date.now when lastAccessed is missing', async () => {
        getTabValueSpy.mockResolvedValue(undefined)
        tabsGetSpy.mockResolvedValue({ id: 42 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'activated')

        expect(setTabValueSpy).toHaveBeenCalledWith(42, 'timestamps', {
            lastSeenAt: 2000,
            lastContentChangeAt: 2000,
            lastUsedAt: 2000,
            lastUsedReason: 'activated',
            lastEventAt: 2000,
        })
    })

    it('updates lastSeenAt for activated reason', async () => {
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 0 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'activated')

        const saved = setTabValueSpy.mock.calls[0][2] as TabTimestampsModel
        expect(saved.lastSeenAt).toBe(2000)
        expect(saved.lastContentChangeAt).toBe(BASE_TS.lastContentChangeAt)
        expect(saved.lastUsedAt).toBe(2000)
        expect(saved.lastUsedReason).toBe('activated')
    })

    it('updates lastSeenAt for focus_changed reason', async () => {
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 0 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'focus_changed')

        const saved = setTabValueSpy.mock.calls[0][2] as TabTimestampsModel
        expect(saved.lastSeenAt).toBe(2000)
        expect(saved.lastContentChangeAt).toBe(BASE_TS.lastContentChangeAt)
    })

    it('updates lastContentChangeAt for url_changed reason', async () => {
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 0 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'url_changed')

        const saved = setTabValueSpy.mock.calls[0][2] as TabTimestampsModel
        expect(saved.lastContentChangeAt).toBe(2000)
        expect(saved.lastSeenAt).toBe(BASE_TS.lastSeenAt)
        expect(saved.lastUsedAt).toBe(Math.max(BASE_TS.lastSeenAt, 2000))
    })

    it('updates both timestamps for created + active tab', async () => {
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 0 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'created', true)

        const saved = setTabValueSpy.mock.calls[0][2] as TabTimestampsModel
        expect(saved.lastSeenAt).toBe(2000)
        expect(saved.lastContentChangeAt).toBe(2000)
    })

    it('updates only lastContentChangeAt for created + background tab', async () => {
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 0 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'created', false)

        const saved = setTabValueSpy.mock.calls[0][2] as TabTimestampsModel
        expect(saved.lastSeenAt).toBe(BASE_TS.lastSeenAt)
        expect(saved.lastContentChangeAt).toBe(2000)
    })

    it('lastUsedAt is always max(lastSeenAt, lastContentChangeAt)', async () => {
        // lastSeenAt will be updated to 2000, lastContentChangeAt stays at 900
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastSeenAt: 500, lastContentChangeAt: 900, lastEventAt: 0 })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'activated')

        const saved = setTabValueSpy.mock.calls[0][2] as TabTimestampsModel
        expect(saved.lastUsedAt).toBe(Math.max(2000, 900))
    })

    it('skips write when within coalesce window and reason has lower priority', async () => {
        // lastEventAt = 1800, now = 2000 → delta = 200ms < 750ms
        // incoming reason load_complete (priority 2) <= current activated (priority 5) → skip
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 1800, lastUsedReason: 'activated' })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'load_complete')

        expect(setTabValueSpy).not.toHaveBeenCalled()
    })

    it('writes when within coalesce window but reason has higher priority', async () => {
        // same time window, but url_changed (priority 6) > activated (priority 5) → write
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 1800, lastUsedReason: 'activated' })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'url_changed')

        expect(setTabValueSpy).toHaveBeenCalled()
    })

    it('writes when outside coalesce window regardless of priority', async () => {
        // lastEventAt = 0, now = 2000 → delta > 750ms → always write
        getTabValueSpy.mockResolvedValue({ ...BASE_TS, lastEventAt: 0, lastUsedReason: 'activated' })
        const touchTab = await loadTouchTab()

        await touchTab(42, 'load_complete')

        expect(setTabValueSpy).toHaveBeenCalled()
    })
})
