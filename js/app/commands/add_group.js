import stateRepository from '/js/infra/repositories/state_repository.js'

export default async function addGroupCommand({
	newGroupName,
	stateRepository: repository = stateRepository,
	onChanged,
} = {}) {
	const groupName = typeof newGroupName === 'string' ? newGroupName.trim() : '';

	if (!groupName) {
		return { ok: false, reason: 'empty-group-name' };
	}

	await repository.addGroup(groupName);

	if (typeof onChanged === 'function') {
		onChanged();
	}

	return { ok: true, groupName };
}
