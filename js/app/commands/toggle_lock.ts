import stateRepository from '../../infra/repositories/state_repository'

interface ToggleLockDeps {
    toggleLock: (url: string) => Promise<unknown>
}

interface ToggleLockInput {
    url?: string
    stateRepository?: ToggleLockDeps
    onChanged?: () => void
}

export default async function toggleLockCommand({
    url,
    stateRepository: repository = stateRepository,
    onChanged,
}: ToggleLockInput = {}) {
    if (!url) {
        return { ok: false, reason: 'empty-url' }
    }

    await repository.toggleLock(url)

    if (typeof onChanged === 'function') {
        onChanged()
    }

    return { ok: true, url }
}