import StateService from '/js/state_service.js'

export default async function ungroupCommand({
    groupName,
    stateService = StateService,
    onChanged,
} = {}) {
    if (!groupName) {
        return { ok: false, reason: 'empty-group-name' };
    }

    const removed = await stateService.removeGroupAndSave(groupName);

    if (removed && typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: removed, groupName };
}
