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

describe('background tabs.onActivated handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('writes timestamps and emits tab_activated when activation succeeds', async () => {
        const { onActivated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onActivated).toBe('function')

        await onActivated({ tabId: 33 })

        expect(getTabValueSpy).toHaveBeenCalledWith(33, 'timestamps')
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(setTabValueSpy).toHaveBeenCalledWith(33, 'timestamps', expect.any(Object))
        const payload = setTabValueSpy.mock.calls[0][2]
        expect(payload.lastUsedReason).toBe('activated')
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_activated',
                changedTabIds: [33],
            },
        })
    })

    it('logs and swallows errors from timestamp update path', async () => {
        const { onActivated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onActivated).toBe('function')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        setTabValueSpy.mockRejectedValue(new Error('setTabValue failed'))

        await expect(onActivated({ tabId: 34 })).resolves.toBeUndefined()

        expect(errorSpy).toHaveBeenCalledWith(
            'Failed to handle tabs.onActivated:',
            expect.any(Error)
        )
        expect(runtimeSendMessageSpy).not.toHaveBeenCalled()
    })
})
