import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('/third_party/webextension-polyfill/browser-polyfill.js', () => ({}))

const {
    tabsGetSpy,
    tabsQuerySpy,
    setTabValueSpy,
    runtimeSendMessageSpy,
} = vi.hoisted(() => ({
    tabsGetSpy: vi.fn(),
    tabsQuerySpy: vi.fn(),
    setTabValueSpy: vi.fn(),
    runtimeSendMessageSpy: vi.fn(),
}))

async function loadBackgroundAndCaptureListeners() {
    vi.resetModules()

    tabsGetSpy.mockReset()
    tabsGetSpy.mockResolvedValue({ id: 10, active: true })
    tabsQuerySpy.mockReset()
    tabsQuerySpy.mockResolvedValue([])
    setTabValueSpy.mockReset()
    setTabValueSpy.mockResolvedValue(undefined)
    runtimeSendMessageSpy.mockReset()
    runtimeSendMessageSpy.mockResolvedValue(undefined)

    const listeners = {}

    globalThis.browser = {
        runtime: {
            getURL: vi.fn(() => 'moz-extension://id/tabs/tabs.html'),
            sendMessage: (...args) => runtimeSendMessageSpy(...args),
            onMessage: {
                addListener: vi.fn(),
            },
        },
        action: {
            onClicked: { addListener: vi.fn() },
        },
        tabs: {
            onCreated: { addListener: vi.fn() },
            onRemoved: { addListener: vi.fn() },
            onActivated: { addListener: vi.fn() },
            onUpdated: {
                addListener: vi.fn((listener) => {
                    listeners.onUpdated = listener
                }),
            },
            query: (...args) => tabsQuerySpy(...args),
            get: (...args) => tabsGetSpy(...args),
            update: vi.fn(),
            create: vi.fn(),
        },
        windows: {
            update: vi.fn(),
            onFocusChanged: {
                addListener: vi.fn((listener) => {
                    listeners.onFocusChanged = listener
                }),
            },
        },
        sessions: {
            setTabValue: (...args) => setTabValueSpy(...args),
        },
    }

    await import('/js/background.ts')

    expect(typeof listeners.onUpdated).toBe('function')
    expect(typeof listeners.onFocusChanged).toBe('function')
    return listeners
}

describe('background tabs.onUpdated handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('emits title update and one tab_updated for active tab url+complete', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners()

        await onUpdated(
            10,
            { title: 'New title', url: 'https://example.com', status: 'complete' },
            { id: 10, active: true }
        )

        expect(tabsGetSpy).toHaveBeenCalledTimes(1)
        expect(tabsGetSpy).toHaveBeenCalledWith(10)
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(2)

        const reasons = runtimeSendMessageSpy.mock.calls.map((args) => args[0].payload.reason)
        expect(reasons).toEqual(['tab_updated_title', 'tab_updated'])
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_updated_title',
                changedTabIds: [10],
                title: 'New title',
            },
        })
    })

    it('does not mark access or emit tab_updated for inactive tab url changes', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners()

        await onUpdated(
            11,
            { url: 'https://example.com' },
            { id: 11, active: false }
        )

        expect(tabsGetSpy).not.toHaveBeenCalled()
        expect(setTabValueSpy).not.toHaveBeenCalled()
        expect(runtimeSendMessageSpy).not.toHaveBeenCalled()
    })

    it('logs and swallows errors from tabs api during update handling', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        tabsGetSpy.mockRejectedValue(new Error('tabs.get failed'))

        await expect(
            onUpdated(12, { url: 'https://example.com' }, { id: 12, active: true })
        ).resolves.toBeUndefined()

        expect(errorSpy).toHaveBeenCalledWith(
            'Failed to handle tabs.onUpdated:',
            expect.any(Error)
        )
    })
})

describe('background windows.onFocusChanged handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('marks active tab and emits tab_activated when focused window changes', async () => {
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners()
        tabsQuerySpy.mockResolvedValue([{ id: 77, active: true }])

        await onFocusChanged(5)

        expect(tabsQuerySpy).toHaveBeenCalledWith({ windowId: 5, active: true })
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(setTabValueSpy).toHaveBeenCalledWith(77, 'lastUpdatedOrAccessed', expect.any(Number))
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_activated',
                changedTabIds: [77],
            },
        })
    })

    it('ignores repeated focus on the same window', async () => {
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners()
        tabsQuerySpy.mockResolvedValue([{ id: 88, active: true }])

        await onFocusChanged(9)
        await onFocusChanged(9)

        expect(tabsQuerySpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
    })

    it('ignores browser blur event and windows with no active tabs', async () => {
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners()
        tabsQuerySpy.mockResolvedValue([])

        await onFocusChanged(-1)
        await onFocusChanged(12)

        expect(tabsQuerySpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy).not.toHaveBeenCalled()
        expect(setTabValueSpy).not.toHaveBeenCalled()
    })

    it('logs and swallows errors during focus change handling', async () => {
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        tabsQuerySpy.mockRejectedValue(new Error('tabs.query failed'))

        await expect(onFocusChanged(13)).resolves.toBeUndefined()

        expect(errorSpy).toHaveBeenCalledWith(
            'Failed to handle windows.onFocusChanged:',
            expect.any(Error)
        )
    })
})
