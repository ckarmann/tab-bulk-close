import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadBackgroundAndCaptureListeners } from '/tests/background/helpers/background_listener_harness.ts'

const {
    getTabValueSpy,
    setTabValueSpy,
    runtimeSendMessageSpy,
} = vi.hoisted(() => ({
    getTabValueSpy: vi.fn(),
    setTabValueSpy: vi.fn(),
    runtimeSendMessageSpy: vi.fn(),
}))

vi.mock('/js/tabs_service.ts', () => ({
    default: {
        getTabValue: (...args: any[]) => getTabValueSpy(...args),
        setTabValue: (...args: any[]) => setTabValueSpy(...args),
        getAllTabs: vi.fn(),
    },
}))

describe('background tabs.onCreated handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('writes timestamps and emits tab_created for active created tab', async () => {
        const { onCreated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onCreated).toBe('function')

        await onCreated({ id: 21, active: true })

        expect(getTabValueSpy).toHaveBeenCalledWith(21, 'timestamps')
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(setTabValueSpy).toHaveBeenCalledWith(21, 'timestamps', expect.any(Object))
        const payload = setTabValueSpy.mock.calls[0][2]
        expect(payload.lastUsedReason).toBe('created')
        expect(payload.lastSeenAt).toBe(payload.lastContentChangeAt)
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_created',
                changedTabIds: [21],
            },
        })
    })

    it('writes timestamps and emits tab_created for background created tab', async () => {
        const { onCreated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onCreated).toBe('function')

        await onCreated({ id: 22, active: false })

        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(setTabValueSpy).toHaveBeenCalledWith(22, 'timestamps', expect.any(Object))
        const payload = setTabValueSpy.mock.calls[0][2]
        expect(payload.lastUsedReason).toBe('created')
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_created',
                changedTabIds: [22],
            },
        })
    })
})
