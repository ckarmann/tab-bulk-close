import { describe, expect, it, vi } from 'vitest'

import addGroupCommand from '/js/app/commands/add_group.js'
import moveDomainCommand from '/js/app/commands/move_domain.js'
import toggleLockCommand from '/js/app/commands/toggle_lock.js'
import ungroupCommand from '/js/app/commands/ungroup.js'

describe('simple command modules', () => {
    it('addGroupCommand trims input, persists, and triggers onChanged', async () => {
        const stateRepository = {
            addGroup: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await addGroupCommand({
            newGroupName: '  Work  ',
            stateRepository,
            onChanged,
        })

        expect(stateRepository.addGroup).toHaveBeenCalledWith('Work')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, groupName: 'Work' })
    })

    it('addGroupCommand rejects an empty group name', async () => {
        const stateRepository = {
            addGroup: vi.fn(),
        }

        const result = await addGroupCommand({
            newGroupName: '   ',
            stateRepository,
        })

        expect(stateRepository.addGroup).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-group-name' })
    })

    it('addGroupCommand rejects non-string group names', async () => {
        const stateRepository = {
            addGroup: vi.fn(),
        }

        const result = await addGroupCommand({
            newGroupName: null,
            stateRepository,
        })

        expect(stateRepository.addGroup).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-group-name' })
    })

    it('ungroupCommand removes the group and triggers onChanged only when removal succeeds', async () => {
        const stateRepository = {
            removeGroup: vi.fn().mockResolvedValue(true),
        }
        const onChanged = vi.fn()

        const result = await ungroupCommand({
            groupName: 'Work',
            stateRepository,
            onChanged,
        })

        expect(stateRepository.removeGroup).toHaveBeenCalledWith('Work')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, groupName: 'Work' })
    })

    it('ungroupCommand does not trigger onChanged when no group was removed', async () => {
        const stateRepository = {
            removeGroup: vi.fn().mockResolvedValue(false),
        }
        const onChanged = vi.fn()

        const result = await ungroupCommand({
            groupName: 'Missing',
            stateRepository,
            onChanged,
        })

        expect(stateRepository.removeGroup).toHaveBeenCalledWith('Missing')
        expect(onChanged).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, groupName: 'Missing' })
    })

    it('ungroupCommand rejects an empty group name', async () => {
        const stateRepository = {
            removeGroup: vi.fn(),
        }

        const result = await ungroupCommand({
            groupName: '',
            stateRepository,
        })

        expect(stateRepository.removeGroup).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-group-name' })
    })

    it('moveDomainCommand persists the new mapping and triggers onChanged', async () => {
        const stateRepository = {
            setDomainGroup: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await moveDomainCommand({
            domain: 'example.com',
            newGroup: 'Work',
            stateRepository,
            onChanged,
        })

        expect(stateRepository.setDomainGroup).toHaveBeenCalledWith('example.com', 'Work')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, domain: 'example.com', newGroup: 'Work' })
    })

    it('moveDomainCommand rejects missing domain or group', async () => {
        const stateRepository = {
            setDomainGroup: vi.fn(),
        }

        const result = await moveDomainCommand({
            domain: '',
            newGroup: 'Work',
            stateRepository,
        })

        expect(stateRepository.setDomainGroup).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'missing-domain-or-group' })
    })

    it('moveDomainCommand persists without onChanged callback', async () => {
        const stateRepository = {
            setDomainGroup: vi.fn().mockResolvedValue(undefined),
        }

        const result = await moveDomainCommand({
            domain: 'example.com',
            newGroup: 'Work',
            stateRepository,
        })

        expect(stateRepository.setDomainGroup).toHaveBeenCalledWith('example.com', 'Work')
        expect(result).toEqual({ ok: true, domain: 'example.com', newGroup: 'Work' })
    })

    it('toggleLockCommand toggles the URL lock and triggers onChanged', async () => {
        const stateRepository = {
            toggleLock: vi.fn().mockResolvedValue(undefined),
        }
        const onChanged = vi.fn()

        const result = await toggleLockCommand({
            url: 'https://example.com',
            stateRepository,
            onChanged,
        })

        expect(stateRepository.toggleLock).toHaveBeenCalledWith('https://example.com')
        expect(onChanged).toHaveBeenCalledTimes(1)
        expect(result).toEqual({ ok: true, url: 'https://example.com' })
    })

    it('toggleLockCommand rejects an empty URL', async () => {
        const stateRepository = {
            toggleLock: vi.fn(),
        }

        const result = await toggleLockCommand({
            url: '',
            stateRepository,
        })

        expect(stateRepository.toggleLock).not.toHaveBeenCalled()
        expect(result).toEqual({ ok: false, reason: 'empty-url' })
    })
})
