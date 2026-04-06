import { cleanMapping } from '/js/domain/tab_grouping.js'

const STATE_KEYS = ['groups', 'mapping', 'lockedUrls']
const DEFAULT_GROUPS = ['Others']

function normalizeStateData(state = {}) {
    return {
        groups: Array.isArray(state.groups) ? state.groups : [...DEFAULT_GROUPS],
        mapping: state.mapping || {},
        lockedUrls: Array.isArray(state.lockedUrls) ? state.lockedUrls : [],
    }
}

export async function loadState() {
    const state = await browser.storage.local.get(STATE_KEYS)
    return normalizeStateData(state)
}

export async function loadStateData() {
    return loadState()
}

export async function saveState(state) {
    const normalizedState = normalizeStateData(state)
    const stateObject = {
        groups: normalizedState.groups,
        mapping: normalizedState.mapping,
        lockedUrls: normalizedState.lockedUrls,
    }
    await browser.storage.local.set(stateObject)
}

export async function saveStateData(state) {
    await saveState(state)
}

export async function setDomainGroup(domain, newGroup) {
    const state = await loadState()
    state.mapping[domain] = newGroup
    await saveState(state)
    return state
}

export async function addGroup(newGroupName) {
    const state = await loadState()
    state.groups.unshift(newGroupName)
    await saveState(state)
    return state
}

export async function removeGroup(groupName) {
    const state = await loadState()
    const groupIndex = state.groups.indexOf(groupName)

    if (groupIndex === -1) {
        return false
    }

    state.groups.splice(groupIndex, 1)

    if (!state.groups.includes('Others')) {
        state.groups.push('Others')
    }

    cleanMapping(state.mapping, state.groups)

    await saveState(state)
    return true
}

export async function toggleLock(url) {
    const state = await loadState()
    const index = state.lockedUrls.indexOf(url)

    if (index > -1) {
        state.lockedUrls.splice(index, 1)
    } else {
        state.lockedUrls.push(url)
    }

    await saveState(state)
    return state
}

export default {
    addGroup,
    loadState,
    loadStateData,
    removeGroup,
    saveState,
    saveStateData,
    setDomainGroup,
    toggleLock,
}
