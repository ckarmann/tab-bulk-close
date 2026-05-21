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

describe('background tabs.onUpdated handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('emits title update and one tab_updated for active tab url+complete', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onUpdated).toBe('function')

        await onUpdated(
            10,
            { title: 'New title', url: 'https://example.com', status: 'complete' },
            { id: 10, active: true }
        )

        expect(getTabValueSpy).toHaveBeenCalledTimes(1)
        expect(getTabValueSpy).toHaveBeenCalledWith(10, 'timestamps')
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(setTabValueSpy).toHaveBeenCalledWith(10, 'timestamps', expect.any(Object))
        const updatedPayload = setTabValueSpy.mock.calls[0][2]
        expect(updatedPayload.lastUsedReason).toBe('url_changed')
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

    it('emits title update but does not write timestamps for title-only updates', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onUpdated).toBe('function')

        await onUpdated(
            13,
            { title: 'Title only change' },
            { id: 13, active: false }
        )

        expect(getTabValueSpy).not.toHaveBeenCalled()
        expect(setTabValueSpy).not.toHaveBeenCalled()
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_updated_title',
                changedTabIds: [13],
                title: 'Title only change',
            },
        })
    })

    it('uses load_complete reason when status complete arrives without url change', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onUpdated).toBe('function')

        await onUpdated(
            14,
            { status: 'complete' },
            { id: 14, active: true }
        )

        expect(getTabValueSpy).toHaveBeenCalledWith(14, 'timestamps')
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        const updatedPayload = setTabValueSpy.mock.calls[0][2]
        expect(updatedPayload.lastUsedReason).toBe('load_complete')
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy.mock.calls[0][0]).toMatchObject({
            type: 'state_changed',
            payload: {
                reason: 'tab_updated',
                changedTabIds: [14],
            },
        })
    })

    it('does not mark access or emit tab_updated for inactive tab url changes', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onUpdated).toBe('function')

        await onUpdated(
            11,
            { url: 'https://example.com' },
            { id: 11, active: false }
        )

        expect(setTabValueSpy).not.toHaveBeenCalled()
        expect(runtimeSendMessageSpy).not.toHaveBeenCalled()
    })

    it('logs and swallows errors from tabs api during update handling', async () => {
        const { onUpdated } = await loadBackgroundAndCaptureListeners({
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onUpdated).toBe('function')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        getTabValueSpy.mockResolvedValue({
            lastSeenAt: 1,
            lastContentChangeAt: 1,
            lastUsedAt: 1,
            lastUsedReason: 'activated',
            lastEventAt: 0,
        })
        setTabValueSpy.mockRejectedValue(new Error('setTabValue failed'))

        await expect(
            onUpdated(12, { url: 'https://example.com' }, { id: 12, active: true })
        ).resolves.toBeUndefined()

        expect(errorSpy).toHaveBeenCalledWith(
            'Failed to handle tabs.onUpdated:',
            expect.any(Error)
        )
    })
})
