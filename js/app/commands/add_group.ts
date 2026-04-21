import stateRepository from '../../infra/repositories/state_repository'

interface AddGroupDeps {
    addGroup: (name: string) => Promise<unknown>
}

interface AddGroupInput {
    newGroupName?: string | null
    stateRepository?: AddGroupDeps
    onChanged?: () => void
}

export default async function addGroupCommand({
    newGroupName,
    stateRepository: repository = stateRepository,
    onChanged,
}: AddGroupInput = {}) {
    const groupName = typeof newGroupName === 'string' ? newGroupName.trim() : ''

    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' }
    }

    await repository.addGroup(groupName)

    if (typeof onChanged === 'function') {
        onChanged()
    }

    return { ok: true, groupName }
}