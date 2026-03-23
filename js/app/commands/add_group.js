import StateService from '/js/state_service.js'

export default async function addGroupCommand({
	newGroupName,
	stateService = StateService,
	onChanged,
} = {}) {
	const groupName = typeof newGroupName === 'string' ? newGroupName.trim() : '';

	if (!groupName) {
		return { ok: false, reason: 'empty-group-name' };
	}

	await stateService.addGroupAndSave(groupName);

	if (typeof onChanged === 'function') {
		onChanged();
	}

	return { ok: true, groupName };
}
