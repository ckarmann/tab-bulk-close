import { cleanMapping } from '../../domain/tab_grouping'
import type { StateData } from '../../shared/contracts'

const STATE_KEYS = ['groups', 'mapping', 'lockedUrls']
const DEFAULT_GROUPS = ['Others']

function normalizeStateData(state: Partial<StateData> = {}): StateData {
    return {
        groups: Array.isArray(state.groups) ? state.groups : [...DEFAULT_GROUPS],
        mapping: state.mapping || {},
        lockedUrls: Array.isArray(state.lockedUrls) ? state.lockedUrls : [],
    }
}

export async function loadState(): Promise<StateData> {
    const state = await browser.storage.local.get(STATE_KEYS)
    return normalizeStateData(state as Partial<StateData>)
}

export async function loadStateData(): Promise<StateData> {
    return loadState()
}

export async function saveState(state: Partial<StateData>): Promise<void> {
    const normalizedState = normalizeStateData(state)
    const stateObject = {
        groups: normalizedState.groups,
        mapping: normalizedState.mapping,
        lockedUrls: normalizedState.lockedUrls,
    }
    await browser.storage.local.set(stateObject)
}

export async function saveStateData(state: Partial<StateData>): Promise<void> {
    await saveState(state)
}

export async function setDomainGroup(domain: string, newGroup: string): Promise<StateData> {
    const state = await loadState()
    state.mapping[domain] = newGroup
    await saveState(state)
    return state
}

export async function addGroup(newGroupName: string): Promise<StateData> {
    const state = await loadState()
    state.groups.unshift(newGroupName)
    await saveState(state)
    return state
}

export async function removeGroup(groupName: string): Promise<boolean> {
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

export async function toggleLock(url: string): Promise<StateData> {
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