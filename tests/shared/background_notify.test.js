import { beforeEach, describe, expect, it, vi } from 'vitest'

import { notifyStateChanged, STATE_CHANGED_MESSAGE } from '/js/shared/background_notify.js'

describe('background notify helper', () => {
    beforeEach(() => {
        globalThis.browser = {
            runtime: {
                sendMessage: vi.fn().mockResolvedValue(undefined),
            },
        }
    })

    it('sends state_changed with normalized payload shape', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(1700000000000)

        const payload = await notifyStateChanged('tab_created', {
            changedTabIds: [42],
            sourceEvent: 'tabs.onCreated',
        })

        expect(globalThis.browser.runtime.sendMessage).toHaveBeenCalledWith({
            type: STATE_CHANGED_MESSAGE,
            payload: {
                source: 'background',
                reason: 'tab_created',
                timestamp: 1700000000000,
                changedTabIds: [42],
                sourceEvent: 'tabs.onCreated',
            },
        })
        expect(payload).toEqual({
            source: 'background',
            reason: 'tab_created',
            timestamp: 1700000000000,
            changedTabIds: [42],
            sourceEvent: 'tabs.onCreated',
        })
    })

    it('does not throw when no message receiver is attached', async () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
        globalThis.browser.runtime.sendMessage.mockRejectedValue(new Error('No receiver'))

        await expect(notifyStateChanged('tab_removed')).resolves.toMatchObject({
            source: 'background',
            reason: 'tab_removed',
            changedTabIds: [],
        })
        expect(debugSpy).toHaveBeenCalled()
    })
})
