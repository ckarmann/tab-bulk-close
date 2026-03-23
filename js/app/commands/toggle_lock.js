import StateService from '/js/state_service.js'

export default async function toggleLockCommand({
    url,
    stateService = StateService,
    onChanged,
} = {}) {
    if (!url) {
        return { ok: false, reason: 'empty-url' };
    }

    await stateService.toggleLock(url);

    if (typeof onChanged === 'function') {
        onChanged();
    }

    return { ok: true, url };
}
