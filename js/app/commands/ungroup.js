import stateRepository from '/js/infra/repositories/state_repository.js'

export default async function ungroupCommand({
    groupName,
    stateRepository: repository = stateRepository,
    onChanged,
} = {}) {
    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' };
    }

    const removed = await repository.removeGroup(groupName);

    if (removed && typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: removed, groupName };
}
