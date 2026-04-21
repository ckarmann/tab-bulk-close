import { describe, expect, it } from 'vitest'

import { findDuplicateTabs } from '/js/domain/tab_duplicates.ts'

describe('tab_duplicates domain', () => {
    it('marks each duplicated urlWithoutHash entry once', () => {
        const tabs = [
            { id: 1, urlWithoutHash: 'https://a.example/path' },
            { id: 2, urlWithoutHash: 'https://b.example/path' },
            { id: 3, urlWithoutHash: 'https://a.example/path' },
            { id: 4, urlWithoutHash: 'https://c.example/path' },
        ]

        const duplicates = findDuplicateTabs(tabs)

        expect(duplicates.map((tab) => tab.id)).toEqual([1, 3])
    })

    it('returns empty list when there are no duplicates', () => {
        const tabs = [
            { id: 1, urlWithoutHash: 'https://a.example/path' },
            { id: 2, urlWithoutHash: 'https://b.example/path' },
        ]

        expect(findDuplicateTabs(tabs)).toEqual([])
    })
})
