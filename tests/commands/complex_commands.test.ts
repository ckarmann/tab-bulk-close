import { describe, expect, it, vi } from 'vitest'

const { enrichTabsSpy } = vi.hoisted(() => ({
    enrichTabsSpy: vi.fn(),
}))

vi.mock('/js/domain/tab_enrichment.ts', () => ({
    enrichTabs: (...args) => enrichTabsSpy(...args),
}))

import closeGroupCommand from '/js/app/commands/close_group.ts'
import extractGroupCommand from '/js/app/commands/extract_group.ts'

describe('complex command modules', () => {
    it('closeGroupCommand closes only closable tabs in the target group', async () => {
        enrichTabsSpy.mockReset()
        const stateRepository = {
            loadState: vi.fn().mockResolvedValue({
                groups: ['Work', 'Others'],
                mapping: { 'work.example': 'Work' },
                lockedUrls: ['https://work.example/locked'],
            }),
        }
        const tabs = [
            { id: 1, url: 'https://work.example/a', pinned: false },
            { id: 2, url: 'https://work.example/locked', pinned: false },
            { id: 3, url: 'https://other.example', pinned: false },
            { id: 4, url: 'https://work.example/pinned', pinned: true },
        ]
        const tabsService = {
            getAllTabs: vi.fn().mockResolvedValue(tabs),
        }
        const filters = {
            filter: vi.fn((tab) => tab.id !== 3),
        }
        const tabsGateway = {
            remove: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await closeGroupCommand({
            groupName: 'Work',
            stateRepository,
            tabsService,
            filters,
            tabsGateway,
            onChanged,
        })

        expect(enrichTabsSpy).toHaveBeenCalledWith(tabs, expect.any(Function))
        expect(tabsGateway.remove).toHaveBeenCalledTimes(1)
        expect(tabsGateway.remove).toHaveBeenCalledWith(1)
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, groupName: 'Work', closedCount: 1 })
    })

    it('extractGroupCommand rejects an empty group', async () => {
        const result = await extractGroupCommand({ group: '' })

        expect(result).toEqual({ ok: false, reason: 'empty-group' })
    })

    it('closeGroupCommand rejects an empty group name', async () => {
        const result = await closeGroupCommand({ groupName: '' })

        expect(result).toEqual({ ok: false, reason: 'empty-group-name' })
    })

    it('closeGroupCommand uses activeFilters payload when provided', async () => {
        enrichTabsSpy.mockReset()
        const stateRepository = {
            loadState: vi.fn().mockResolvedValue({
                groups: ['Work', 'Others'],
                mapping: { 'work.example': 'Work' },
                lockedUrls: [],
            }),
        }
        const tabs = [
            { id: 1, url: 'https://work.example/a', pinned: false, duplicate: true },
            { id: 2, url: 'https://work.example/b', pinned: false, duplicate: false },
        ]
        const tabsService = {
            getAllTabs: vi.fn().mockResolvedValue(tabs),
        }
        const tabsGateway = {
            remove: vi.fn().mockResolvedValue(undefined),
        }

        const result = await closeGroupCommand({
            groupName: 'Work',
            activeFilters: {
                'filter-duplicates': {
                    attributes: 'duplicate',
                    check: null,
                    filterValue: null,
                },
            },
            stateRepository,
            tabsService,
            tabsGateway,
        })

        expect(tabsGateway.remove).toHaveBeenCalledTimes(1)
        expect(tabsGateway.remove).toHaveBeenCalledWith(1)
        expect(result).toEqual({ ok: true, groupName: 'Work', closedCount: 1 })
    })

    it('extractGroupCommand focuses the existing window when the group already occupies it', async () => {
        const stateRepository = {
            loadState: vi.fn().mockResolvedValue({
                groups: ['Work', 'Others'],
                mapping: { 'example.com': 'Work' },
                lockedUrls: [],
            }),
        }
        const tabsService = {
            getAllTabs: vi.fn().mockResolvedValue([
                { id: 10, windowId: 7, url: 'https://example.com/a' },
                { id: 11, windowId: 7, url: 'https://example.com/b' },
            ]),
        }
        const windowsGateway = {
            get: vi.fn().mockResolvedValue({ tabs: [{ id: 10 }, { id: 11 }] }),
            update: vi.fn().mockResolvedValue(undefined),
            create: vi.fn(),
        }
        const tabsGateway = {
            update: vi.fn().mockResolvedValue(undefined),
            move: vi.fn(),
        }

        const result = await extractGroupCommand({
            group: 'Work',
            stateRepository,
            tabsService,
            windowsGateway,
            tabsGateway,
        })

        expect(windowsGateway.get).toHaveBeenCalledWith(7, { populate: true })
        expect(windowsGateway.update).toHaveBeenCalledWith(7, { focused: true })
        expect(tabsGateway.update).toHaveBeenCalledWith(10, { active: true })
        expect(windowsGateway.create).not.toHaveBeenCalled()
        expect(tabsGateway.move).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: true, group: 'Work', moved: false, reason: 'already-in-single-window' })
    })

    it('extractGroupCommand creates a new window and moves tabs when needed', async () => {
        const stateRepository = {
            loadState: vi.fn().mockResolvedValue({
                groups: ['Work', 'Others'],
                mapping: { 'example.com': 'Work' },
                lockedUrls: [],
            }),
        }
        const tabsService = {
            getAllTabs: vi.fn().mockResolvedValue([
                { id: 10, windowId: 7, url: 'https://example.com/a' },
                { id: 11, windowId: 8, url: 'https://example.com/b' },
            ]),
        }
        const windowsGateway = {
            get: vi.fn(),
            update: vi.fn(),
            create: vi.fn().mockResolvedValue({ id: 22 }),
        }
        const tabsGateway = {
            update: vi.fn(),
            move: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await extractGroupCommand({
            group: 'Work',
            stateRepository,
            tabsService,
            windowsGateway,
            tabsGateway,
            onChanged,
        })

        expect(windowsGateway.create).toHaveBeenCalledWith({ focused: true, tabId: 10 })
        expect(tabsGateway.move).toHaveBeenCalledWith([10, 11], { windowId: 22, index: -1 })
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, group: 'Work', moved: true, windowId: 22, tabCount: 2 })
    })

    it('extractGroupCommand fails when the group has no mapped domains', async () => {
        const stateRepository = {
            loadState: vi.fn().mockResolvedValue({
                groups: ['Work', 'Others'],
                mapping: {},
                lockedUrls: [],
            }),
        }
        const tabsService = {
            getAllTabs: vi.fn().mockResolvedValue([]),
        }

        const result = await extractGroupCommand({
            group: 'Work',
            stateRepository,
            tabsService,
        })

        expect(result).toEqual({ ok: false, reason: 'group-has-no-domains' })
    })

    it('extractGroupCommand creates a new window when single window has extra tabs', async () => {
        const stateRepository = {
            loadState: vi.fn().mockResolvedValue({
                groups: ['Work', 'Others'],
                mapping: { 'example.com': 'Work' },
                lockedUrls: [],
            }),
        }
        const tabsService = {
            getAllTabs: vi.fn().mockResolvedValue([
                { id: 10, windowId: 7, url: 'https://example.com/a' },
                { id: 11, windowId: 7, url: 'https://example.com/b' },
            ]),
        }
        const windowsGateway = {
            get: vi.fn().mockResolvedValue({ tabs: [{ id: 10 }, { id: 11 }, { id: 99 }] }),
            update: vi.fn(),
            create: vi.fn().mockResolvedValue({ id: 22 }),
        }
        const tabsGateway = {
            update: vi.fn(),
            move: vi.fn().mockResolvedValue(undefined),
        }

        const result = await extractGroupCommand({
            group: 'Work',
            stateRepository,
            tabsService,
            windowsGateway,
            tabsGateway,
        })

        expect(windowsGateway.get).toHaveBeenCalledWith(7, { populate: true })
        expect(windowsGateway.create).toHaveBeenCalledWith({ focused: true, tabId: 10 })
        expect(tabsGateway.move).toHaveBeenCalledWith([10, 11], { windowId: 22, index: -1 })
        expect(result).toEqual({ ok: true, group: 'Work', moved: true, windowId: 22, tabCount: 2 })
    })
})
