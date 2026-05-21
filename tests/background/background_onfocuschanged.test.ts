import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadBackgroundAndCaptureListeners } from '/tests/background/helpers/background_listener_harness.ts'

const {
    tabsQuerySpy,
    getTabValueSpy,
    setTabValueSpy,
    runtimeSendMessageSpy,
} = vi.hoisted(() => ({
    tabsQuerySpy: vi.fn(),
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

describe('background windows.onFocusChanged handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('marks active tab and emits tab_activated when focused window changes', async () => {
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners({
            tabsQuerySpy,
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onFocusChanged).toBe('function')
        tabsQuerySpy.mockResolvedValue([{ id: 77, active: true }])

        await onFocusChanged(5)

        expect(tabsQuerySpy).toHaveBeenCalledWith({ windowId: 5, active: true })
        expect(setTabValueSpy).toHaveBeenCalledTimes(1)
        expect(setTabValueSpy).toHaveBeenCalledWith(77, 'timestamps', expect.any(Object))
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
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners({
            tabsQuerySpy,
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onFocusChanged).toBe('function')
        tabsQuerySpy.mockResolvedValue([{ id: 88, active: true }])

        await onFocusChanged(9)
        await onFocusChanged(9)

        expect(tabsQuerySpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy).toHaveBeenCalledTimes(1)
    })

    it('ignores browser blur event and windows with no active tabs', async () => {
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners({
            tabsQuerySpy,
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onFocusChanged).toBe('function')
        tabsQuerySpy.mockResolvedValue([])

        await onFocusChanged(-1)
        await onFocusChanged(12)

        expect(tabsQuerySpy).toHaveBeenCalledTimes(1)
        expect(runtimeSendMessageSpy).not.toHaveBeenCalled()
        expect(setTabValueSpy).not.toHaveBeenCalled()
    })

    it('logs and swallows errors during focus change handling', async () => {
        const { onFocusChanged } = await loadBackgroundAndCaptureListeners({
            tabsQuerySpy,
            getTabValueSpy,
            setTabValueSpy,
            runtimeSendMessageSpy,
        })
        expect(typeof onFocusChanged).toBe('function')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        tabsQuerySpy.mockRejectedValue(new Error('tabs.query failed'))

        await expect(onFocusChanged(13)).resolves.toBeUndefined()

        expect(errorSpy).toHaveBeenCalledWith(
            'Failed to handle windows.onFocusChanged:',
            expect.any(Error)
        )
    })
})
