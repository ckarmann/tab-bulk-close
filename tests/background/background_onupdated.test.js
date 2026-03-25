import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('/js/polyfill/browser-polyfill.js', () => ({}))

const {
    tabsGetSpy,
    setTabValueSpy,
    runtimeSendMessageSpy,
} = vi.hoisted(() => ({
    tabsGetSpy: vi.fn(),
    setTabValueSpy: vi.fn(),
    runtimeSendMessageSpy: vi.fn(),
}))

async function loadBackgroundAndCaptureOnUpdated() {
    vi.resetModules()

    tabsGetSpy.mockReset()
    tabsGetSpy.mockResolvedValue({ id: 10, active: true })
    setTabValueSpy.mockReset()
    setTabValueSpy.mockResolvedValue(undefined)
    runtimeSendMessageSpy.mockReset()
    runtimeSendMessageSpy.mockResolvedValue(undefined)

    const listeners = {}

    globalThis.browser = {
        runtime: {
            getURL: vi.fn(() => 'moz-extension://id/tabs/tabs.html'),
            sendMessage: (...args) => runtimeSendMessageSpy(...args),
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
            query: vi.fn().mockResolvedValue([]),
            get: (...args) => tabsGetSpy(...args),
            update: vi.fn(),
            create: vi.fn(),
        },
        windows: {
            update: vi.fn(),
        },
        sessions: {
            setTabValue: (...args) => setTabValueSpy(...args),
        },
    }

    await import('/js/background.js')

    expect(typeof listeners.onUpdated).toBe('function')
    return listeners.onUpdated
}

describe('background tabs.onUpdated handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('emits title update and one tab_updated for active tab url+complete', async () => {
        const onUpdated = await loadBackgroundAndCaptureOnUpdated()

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
        const onUpdated = await loadBackgroundAndCaptureOnUpdated()

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
        const onUpdated = await loadBackgroundAndCaptureOnUpdated()
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
