import { describe, expect, it } from 'vitest'

import { enrichTabs } from '/js/domain/tab_enrichment.ts'

describe('tab_enrichment domain', () => {
    it('enriches tabs with derived fields, duplicate flags, and active-filter result', () => {
        const now = Date.now()
        const tabs = [
            {
                id: 1,
                url: 'https://a.example/path#one',
                timeValue: now - 60_000,
                pinned: false,
            },
            {
                id: 2,
                url: 'https://a.example/path#two',
                lastAccessed: now - 120_000,
                pinned: false,
            },
            {
                id: 3,
                url: 'https://b.example/other',
                lastAccessed: now - 120_000,
                pinned: false,
            },
        ]

        const isLocked = (url) => url.includes('b.example')

        enrichTabs(tabs, isLocked, {
            'filter-duplicates': {
                attributes: 'duplicate',
                check: null,
                filterValue: null,
            },
        })

        expect(tabs[0].urlWithoutHash).toBe('https://a.example/path')
        expect(tabs[0].locked).toBe(false)
        expect(tabs[0].lastAccessedColor).toBe('black')
        expect(tabs[0].lastAccessedFriendly).toBeTypeOf('string')
        expect(tabs[0].lastAccessedString).toBeTypeOf('string')
        expect(tabs[0].dayFilter).toBe('today')

        expect(tabs[1].lastAccessedColor).toBe('red')

        expect(tabs[0].duplicate).toBe(true)
        expect(tabs[1].duplicate).toBe(true)
        expect(tabs[2].duplicate).toBeUndefined()

        expect(tabs[0].filtered).toBe(true)
        expect(tabs[1].filtered).toBe(true)
        expect(tabs[2].filtered).toBe(false)
    })

    it('defaults to filtered=true when no active filter is provided', () => {
        const tabs = [
            {
                id: 11,
                url: 'https://example.org/demo',
                lastAccessed: Date.now() - 1_000,
                pinned: false,
            },
        ]

        enrichTabs(tabs, () => false)

        expect(tabs[0].filtered).toBe(true)
    })
})
