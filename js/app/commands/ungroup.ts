import stateRepository from '../../infra/repositories/state_repository'

interface UngroupDeps {
    removeGroup: (groupName: string) => Promise<boolean>
}

interface UngroupInput {
    groupName?: string
    stateRepository?: UngroupDeps
    onChanged?: () => void
}

export default async function ungroupCommand({
    groupName,
    stateRepository: repository = stateRepository,
    onChanged,
}: UngroupInput = {}) {
    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' }
    }

    const removed = await repository.removeGroup(groupName)

    if (removed && typeof onChanged === 'function') {
        onChanged()
    }

    return { ok: removed, groupName }
}