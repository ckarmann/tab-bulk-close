import stateRepository from '../../infra/repositories/state_repository'

interface MoveDomainDeps {
    setDomainGroup: (domain: string, group: string) => Promise<unknown>
}

interface MoveDomainInput {
    domain?: string
    newGroup?: string
    stateRepository?: MoveDomainDeps
    onChanged?: () => void
}

export default async function moveDomainCommand({
    domain,
    newGroup,
    stateRepository: repository = stateRepository,
    onChanged,
}: MoveDomainInput = {}) {
    if (!domain || !newGroup) {
        return { ok: false, reason: 'missing-domain-or-group' }
    }

    await repository.setDomainGroup(domain, newGroup)

    if (typeof onChanged === 'function') {
        onChanged()
    }

    return { ok: true, domain, newGroup }
}