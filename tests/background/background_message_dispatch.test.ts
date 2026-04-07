import { describe, expect, it, vi } from 'vitest'

const { routeMessageSpy } = vi.hoisted(() => ({
    routeMessageSpy: vi.fn(),
}))

vi.mock('/js/app/message_router.ts', () => ({
    default: (...args) => routeMessageSpy(...args),
}))

async function loadBackgroundAndCaptureRuntimeMessageListener() {
    vi.resetModules()
    routeMessageSpy.mockReset()

    const listeners = {}

    globalThis.browser = {
        runtime: {
            getURL: vi.fn(() => 'moz-extension://id/tabs.html'),
            sendMessage: vi.fn().mockResolvedValue(undefined),
            onMessage: {
                addListener: vi.fn((listener) => {
                    listeners.onMessage = listener
                }),
            },
        },
        action: {
            onClicked: { addListener: vi.fn() },
        },
        tabs: {
            onCreated: { addListener: vi.fn() },
            onRemoved: { addListener: vi.fn() },
            onActivated: { addListener: vi.fn() },
            onUpdated: { addListener: vi.fn() },
            query: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue({ id: 1, active: true }),
            update: vi.fn(),
            create: vi.fn(),
        },
        windows: {
            update: vi.fn(),
            onFocusChanged: { addListener: vi.fn() },
        },
        sessions: {
            setTabValue: vi.fn().mockResolvedValue(undefined),
        },
    }

    await import('/js/background.ts')

    expect(typeof listeners.onMessage).toBe('function')
    return listeners.onMessage
}

describe('background runtime command dispatch', () => {
    it('routes command messages through message router', async () => {
        const onMessage = await loadBackgroundAndCaptureRuntimeMessageListener()
        routeMessageSpy.mockResolvedValue({ ok: true, result: { ok: true } })

        const message = {
            type: 'command:add_group',
            payload: { newGroupName: 'Work' },
            requestId: 'r1',
        }

        const result = await onMessage(message)

        expect(routeMessageSpy).toHaveBeenCalledWith(message)
        expect(result).toEqual({ ok: true, result: { ok: true } })
    })

    it('ignores non command/query message types', async () => {
        const onMessage = await loadBackgroundAndCaptureRuntimeMessageListener()

        const result = await onMessage({
            type: 'state_changed',
            payload: { reason: 'tab_updated' },
        })

        expect(routeMessageSpy).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
    })
})
