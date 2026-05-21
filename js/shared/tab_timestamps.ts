import type { TabTimestampsModel, UsageReason } from './contracts'

export function computeLastUsedAt(lastSeenAt: number, lastContentChangeAt: number): number {
    return Math.max(lastSeenAt, lastContentChangeAt)
}

export function makeTimestamps(
    lastSeenAt: number,
    lastContentChangeAt: number,
    lastUsedReason: UsageReason,
    lastEventAt: number = Date.now(),
): TabTimestampsModel {
    return {
        lastSeenAt,
        lastContentChangeAt,
        lastUsedAt: computeLastUsedAt(lastSeenAt, lastContentChangeAt),
        lastUsedReason,
        lastEventAt,
    }
}
