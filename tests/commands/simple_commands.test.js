import { describe, expect, it, vi } from 'vitest'

import addGroupCommand from '/js/app/commands/add_group.js'
import moveDomainCommand from '/js/app/commands/move_domain.js'
import toggleLockCommand from '/js/app/commands/toggle_lock.js'
import ungroupCommand from '/js/app/commands/ungroup.js'

describe('simple command modules', () => {
    it('addGroupCommand trims input, persists, and triggers onChanged', async () => {
        const stateService = {
            addGroupAndSave: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await addGroupCommand({
            newGroupName: '  Work  ',
            stateService,
            onChanged,
        })

        expect(stateService.addGroupAndSave).toHaveBeenCalledWith('Work')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, groupName: 'Work' })
    })

    it('addGroupCommand rejects an empty group name', async () => {
        const stateService = {
            addGroupAndSave: vi.fn(),
        }

        const result = await addGroupCommand({
            newGroupName: '   ',
            stateService,
        })

        expect(stateService.addGroupAndSave).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-group-name' })
    })

    it('addGroupCommand rejects non-string group names', async () => {
        const stateService = {
            addGroupAndSave: vi.fn(),
        }

        const result = await addGroupCommand({
            newGroupName: null,
            stateService,
        })

        expect(stateService.addGroupAndSave).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-group-name' })
    })

    it('ungroupCommand removes the group and triggers onChanged only when removal succeeds', async () => {
        const stateService = {
            removeGroupAndSave: vi.fn().mockResolvedValue(true),
        }
        const onChanged = vi.fn()

        const result = await ungroupCommand({
            groupName: 'Work',
            stateService,
            onChanged,
        })

        expect(stateService.removeGroupAndSave).toHaveBeenCalledWith('Work')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, groupName: 'Work' })
    })

    it('ungroupCommand does not trigger onChanged when no group was removed', async () => {
        const stateService = {
            removeGroupAndSave: vi.fn().mockResolvedValue(false),
        }
        const onChanged = vi.fn()

        const result = await ungroupCommand({
            groupName: 'Missing',
            stateService,
            onChanged,
        })

        expect(stateService.removeGroupAndSave).toHaveBeenCalledWith('Missing')
        expect(onChanged).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, groupName: 'Missing' })
    })

    it('ungroupCommand rejects an empty group name', async () => {
        const stateService = {
            removeGroupAndSave: vi.fn(),
        }

        const result = await ungroupCommand({
            groupName: '',
            stateService,
        })

        expect(stateService.removeGroupAndSave).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-group-name' })
    })

    it('moveDomainCommand persists the new mapping and triggers onChanged', async () => {
        const stateService = {
            setDomainGroupAndSave: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await moveDomainCommand({
            domain: 'example.com',
            newGroup: 'Work',
            stateService,
            onChanged,
        })

        expect(stateService.setDomainGroupAndSave).toHaveBeenCalledWith('example.com', 'Work')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, domain: 'example.com', newGroup: 'Work' })
    })

    it('moveDomainCommand rejects missing domain or group', async () => {
        const stateService = {
            setDomainGroupAndSave: vi.fn(),
        }

        const result = await moveDomainCommand({
            domain: '',
            newGroup: 'Work',
            stateService,
        })

        expect(stateService.setDomainGroupAndSave).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'missing-domain-or-group' })
    })

    it('moveDomainCommand persists without onChanged callback', async () => {
        const stateService = {
            setDomainGroupAndSave: vi.fn().mockResolvedValue(undefined),
        }

        const result = await moveDomainCommand({
            domain: 'example.com',
            newGroup: 'Work',
            stateService,
        })

        expect(stateService.setDomainGroupAndSave).toHaveBeenCalledWith('example.com', 'Work')
        expect(result).toEqual({ ok: true, domain: 'example.com', newGroup: 'Work' })
    })

    it('toggleLockCommand toggles the URL lock and triggers onChanged', async () => {
        const stateService = {
            toggleLock: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await toggleLockCommand({
            url: 'https://example.com',
            stateService,
            onChanged,
        })

        expect(stateService.toggleLock).toHaveBeenCalledWith('https://example.com')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, url: 'https://example.com' })
    })

    it('toggleLockCommand rejects an empty URL', async () => {
        const stateService = {
            toggleLock: vi.fn(),
        }

        const result = await toggleLockCommand({
            url: '',
            stateService,
        })

        expect(stateService.toggleLock).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-url' })
    })
})
