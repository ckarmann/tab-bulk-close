import type { StateChangedPayload } from './contracts.ts'

export const STATE_CHANGED_MESSAGE = 'state_changed'

export async function notifyStateChanged(
    reason: string,
    meta: Partial<StateChangedPayload> = {},
): Promise<StateChangedPayload> {
    const payload: StateChangedPayload = {
        source: 'background',
        reason,
        timestamp: Date.now(),
        changedTabIds: Array.isArray(meta.changedTabIds) ? meta.changedTabIds : [],
    }

    if (meta && typeof meta === 'object') {
        for (const [key, value] of Object.entries(meta)) {
            if (key !== 'changedTabIds') {
                payload[key] = value
            }
        }
    }

    try {
        await browser.runtime.sendMessage({
            type: STATE_CHANGED_MESSAGE,
            payload,
        })
    } catch (error) {
        // If no receiver is attached yet, we still keep lifecycle handling successful.
        console.debug('state_changed notification skipped:', error)
    }

    return payload
}