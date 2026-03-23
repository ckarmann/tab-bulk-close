import StateService from '/js/state_service.js'

export default async function moveDomainCommand({
    domain,
    newGroup,
    stateService = StateService,
    onChanged,
} = {}) {
    if (!domain || !newGroup) {
        return { ok: false, reason: 'missing-domain-or-group' };
    }

    await stateService.setDomainGroupAndSave(domain, newGroup);

    if (typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: true, domain, newGroup };
}
