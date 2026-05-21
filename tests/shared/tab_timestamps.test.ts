import { describe, expect, it } from 'vitest'

import { computeLastUsedAt, makeTimestamps } from '/js/shared/tab_timestamps.ts'

describe('computeLastUsedAt', () => {
    it('returns lastSeenAt when it is greater', () => {
        expect(computeLastUsedAt(2000, 1000)).toBe(2000)
    })

    it('returns lastContentChangeAt when it is greater', () => {
        expect(computeLastUsedAt(1000, 2000)).toBe(2000)
    })

    it('returns the value when both are equal', () => {
        expect(computeLastUsedAt(1500, 1500)).toBe(1500)
    })
})

describe('makeTimestamps', () => {
    it('sets all fields and derives lastUsedAt from max of seen/content', () => {
        const ts = makeTimestamps(2000, 1000, 'activated', 3000)

        expect(ts).toEqual({
            lastSeenAt: 2000,
            lastContentChangeAt: 1000,
            lastUsedAt: 2000,
            lastUsedReason: 'activated',
            lastEventAt: 3000,
        })
    })

    it('derives lastUsedAt from lastContentChangeAt when it is greater', () => {
        const ts = makeTimestamps(1000, 5000, 'url_changed', 6000)

        expect(ts.lastUsedAt).toBe(5000)
    })

    it('uses Date.now() for lastEventAt when omitted', () => {
        const before = Date.now()
        const ts = makeTimestamps(1000, 2000, 'created')
        const after = Date.now()

        expect(ts.lastEventAt).toBeGreaterThanOrEqual(before)
        expect(ts.lastEventAt).toBeLessThanOrEqual(after)
    })
})
