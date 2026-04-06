import stateRepository from '/js/infra/repositories/state_repository.js'

export default async function toggleLockCommand({
    url,
    stateRepository: repository = stateRepository,
    onChanged,
} = {}) {
    if (!url) {
        return { ok: false, reason: 'empty-url' };
    }

    await repository.toggleLock(url);

    if (typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: true, url };
}
