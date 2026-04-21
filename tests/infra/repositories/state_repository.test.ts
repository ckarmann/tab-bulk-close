import { describe, expect, it, vi, beforeEach } from 'vitest'

import stateRepository from '/js/infra/repositories/state_repository.ts'

describe('state_repository', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        globalThis.browser = {
            storage: {
                local: {
                    get: vi.fn(),
                    set: vi.fn(),
                },
            },
        }
    })

    it('loads state data from expected keys', async () => {
        browser.storage.local.get.mockResolvedValue({
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        })

        const state = await stateRepository.loadStateData()

        expect(browser.storage.local.get).toHaveBeenCalledWith(['groups', 'mapping', 'lockedUrls'])
        expect(state).toEqual({
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        })
    })

    it('normalizes missing state fields on load', async () => {
        browser.storage.local.get.mockResolvedValue({})

        const state = await stateRepository.loadState()

        expect(state).toEqual({
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        })
    })

    it('saves only persisted state fields', async () => {
        const state = {
            groups: ['Work', 'Others'],
            mapping: { 'a.example': 'Work' },
            lockedUrls: ['https://a.example'],
            transient: 'ignored',
        }

        await stateRepository.saveStateData(state)

        expect(browser.storage.local.set).toHaveBeenCalledWith({
            groups: ['Work', 'Others'],
            mapping: { 'a.example': 'Work' },
            lockedUrls: ['https://a.example'],
        })
    })

    it('adds a group by loading, mutating, and saving state', async () => {
        browser.storage.local.get.mockResolvedValue({
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        })

        const state = await stateRepository.addGroup('Work')

        expect(state).toEqual({
            groups: ['Work', 'Others'],
            mapping: {},
            lockedUrls: [],
        })
        expect(browser.storage.local.set).toHaveBeenCalledWith({
            groups: ['Work', 'Others'],
            mapping: {},
            lockedUrls: [],
        })
    })

    it('updates a domain mapping and persists the result', async () => {
        browser.storage.local.get.mockResolvedValue({
            groups: ['Work', 'Others'],
            mapping: {},
            lockedUrls: [],
        })

        const state = await stateRepository.setDomainGroup('example.com', 'Work')

        expect(state.mapping).toEqual({ 'example.com': 'Work' })
        expect(browser.storage.local.set).toHaveBeenCalledWith({
            groups: ['Work', 'Others'],
            mapping: { 'example.com': 'Work' },
            lockedUrls: [],
        })
    })

    it('removes a group, keeps Others, and cleans stale mappings', async () => {
        browser.storage.local.get.mockResolvedValue({
            groups: ['Work'],
            mapping: {
                'example.com': 'Work',
                'other.com': 'Others',
            },
            lockedUrls: [],
        })

        const removed = await stateRepository.removeGroup('Work')

        expect(removed).toBe(true)
        expect(browser.storage.local.set).toHaveBeenCalledWith({
            groups: ['Others'],
            mapping: { 'other.com': 'Others' },
            lockedUrls: [],
        })
    })

    it('returns false without saving when removing a missing group', async () => {
        browser.storage.local.get.mockResolvedValue({
            groups: ['Work', 'Others'],
            mapping: {},
            lockedUrls: [],
        })

        const removed = await stateRepository.removeGroup('Missing')

        expect(removed).toBe(false)
        expect(browser.storage.local.set).not.toHaveBeenCalled()
    })

    it('toggles a lock by adding the URL when it is absent', async () => {
        browser.storage.local.get.mockResolvedValue({
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        })

        const state = await stateRepository.toggleLock('https://example.com')

        expect(state.lockedUrls).toEqual(['https://example.com'])
        expect(browser.storage.local.set).toHaveBeenCalledWith({
            groups: ['Others'],
            mapping: {},
            lockedUrls: ['https://example.com'],
        })
    })

    it('toggles a lock by removing the URL when it is present', async () => {
        browser.storage.local.get.mockResolvedValue({
            groups: ['Others'],
            mapping: {},
            lockedUrls: ['https://example.com'],
        })

        const state = await stateRepository.toggleLock('https://example.com')

        expect(state.lockedUrls).toEqual([])
        expect(browser.storage.local.set).toHaveBeenCalledWith({
            groups: ['Others'],
            mapping: {},
            lockedUrls: [],
        })
    })
})
