import { describe, expect, it } from 'vitest'

import {
    applyGrouping,
    buildDomainMap,
    classifyDomains,
    cleanMapping,
    getDomainFromUrl,
    isTabInGroup,
    moveOthersToEnd,
} from '/js/domain/tab_grouping.js'

describe('tab_grouping domain', () => {
    it('removes mappings for groups that no longer exist', () => {
        const mapping = {
            'a.example': 'Work',
            'b.example': 'OldGroup',
            'c.example': 'Others',
        }

        cleanMapping(mapping, ['Work', 'Others'])

        expect(mapping).toEqual({
            'a.example': 'Work',
            'c.example': 'Others',
        })
    })

    it('keeps mapping untouched when all groups exist', () => {
        const mapping = {
            'a.example': 'Work',
            'b.example': 'Others',
        }

        cleanMapping(mapping, ['Work', 'Others'])

        expect(mapping).toEqual({
            'a.example': 'Work',
            'b.example': 'Others',
        })
    })

    it('extracts domain key with fallback for hostless urls', () => {
        expect(getDomainFromUrl('https://example.com/path')).toBe('example.com')
        expect(getDomainFromUrl('about:config')).toBe('about:config')
    })

    it('builds domain map from tabs', () => {
        const tabs = [
            { id: 1, url: 'https://a.example/path' },
            { id: 2, url: 'https://a.example/other' },
            { id: 3, url: 'https://b.example/x' },
        ]

        const domainMap = buildDomainMap(tabs)

        expect(Object.keys(domainMap)).toEqual(['a.example', 'b.example'])
        expect(domainMap['a.example'].map((tab) => tab.id)).toEqual([1, 2])
        expect(domainMap['b.example'].map((tab) => tab.id)).toEqual([3])
    })

    it('classifies domains to mapped groups with Others fallback', () => {
        const domainMap = {
            'a.example': [{}],
            'b.example': [{}],
        }
        const groupMap = classifyDomains(domainMap, {
            'a.example': 'Work',
        })

        expect(groupMap).toEqual({
            Work: ['a.example'],
            Others: ['b.example'],
        })
    })

    it('moves Others group to the end for stable UI ordering', () => {
        const reordered = moveOthersToEnd({
            Others: ['x'],
            Work: ['a'],
            Personal: ['b'],
        })

        expect(Object.keys(reordered)).toEqual(['Work', 'Personal', 'Others'])
    })

    it('applies grouping end-to-end with clean mapping and classification', () => {
        const tabs = [
            { id: 1, url: 'https://a.example/path' },
            { id: 2, url: 'https://b.example/path' },
        ]
        const groups = ['Work', 'Others']
        const mapping = {
            'a.example': 'Work',
            'legacy.example': 'Legacy',
        }

        const [resolvedGroups, groupMap, domainMap] = applyGrouping(tabs, groups, mapping)

        expect(resolvedGroups).toBe(groups)
        expect(mapping).toEqual({ 'a.example': 'Work' })
        expect(Object.keys(groupMap)).toEqual(['Work', 'Others'])
        expect(groupMap.Work).toEqual(['a.example'])
        expect(groupMap.Others).toEqual(['b.example'])
        expect(Object.keys(domainMap)).toEqual(['a.example', 'b.example'])
    })

    it('checks tab membership in a group using the mapping', () => {
        const mapping = {
            'a.example': 'Work',
        }

        expect(isTabInGroup('https://a.example/path', 'Work', mapping)).toBe(true)
        expect(isTabInGroup('https://a.example/path', 'Others', mapping)).toBe(false)
        expect(isTabInGroup('about:config', 'Others', mapping)).toBe(false)
    })
})
