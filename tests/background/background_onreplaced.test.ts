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

describe('background tabs.onReplaced handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('copies timestamps to added tab id and emits tab_updated', async () => {
        const { onReplaced } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onReplaced).toBe('function')

        getTabValueSpy.mockResolvedValue({
            lastSeenAt: 100,
            lastContentChangeAt: 90,
            lastUsedAt: 100,
            lastUsedReason: 'activated',
            lastEventAt: 100,
        })

        await onReplaced!(44, 33)

        expect(getTabValueSpy).toHaveBeenCalledWith(33, 'timestamps')
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(setTabValueSpy).toHaveBeenCalledWith(44, 'timestamps', {
            lastSeenAt: 100,
            lastContentChangeAt: 90,
            lastUsedAt: 100,
            lastUsedReason: 'activated',
            lastEventAt: 100,
        })
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_updated',
                changedTabIds: [44],
            },
        })
    })

    it('does nothing when removed tab has no timestamps', async () => {
        const { onReplaced } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onReplaced).toBe('function')

        getTabValueSpy.mockResolvedValue(undefined)

        await onReplaced!(55, 22)

        expect(getTabValueSpy).toHaveBeenCalledWith(22, 'timestamps')
        expect(setTabValueSpy).not.toHaveBeenCalled()
        expect(runtimeSendMessageSpy).not.toHaveBeenCalled()
    })

    it('logs and swallows errors from replacement handling', async () => {
        const { onReplaced } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onReplaced).toBe('function')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        getTabValueSpy.mockRejectedValue(new Error('getTabValue failed'))

        await expect(onReplaced!(66, 11)).resolves.toBeUndefined()

        expect(errorSpy).toHaveBeenCalledWith(
            'Failed to handle tabs.onReplaced:',
            expect.any(Error)
        )
        expect(setTabValueSpy).not.toHaveBeenCalled()
        expect(runtimeSendMessageSpy).not.toHaveBeenCalled()
    })
})
