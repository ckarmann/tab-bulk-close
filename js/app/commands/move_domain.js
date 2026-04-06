import stateRepository from '/js/infra/repositories/state_repository.js'

export default async function moveDomainCommand({
    domain,
    newGroup,
    stateRepository: repository = stateRepository,
    onChanged,
} = {}) {
    if (!domain || !newGroup) {
        return { ok: false, reason: 'missing-domain-or-group' };
    }

    await repository.setDomainGroup(domain, newGroup);

    if (typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: true, domain, newGroup };
}
