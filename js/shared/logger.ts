const DEBUG_FLAG_KEY = '__TABCLOSER_DEBUG__'
const DEBUG_STORAGE_KEY = 'tabcloser:debug'

function readDebugFlagFromStorage(): boolean {
    try {
        if (typeof localStorage === 'undefined') {
            return false
        }

        const value = localStorage.getItem(DEBUG_STORAGE_KEY)
        return value === '1' || value === 'true'
    } catch {
        return false
    }
}

export function isDebugEnabled(): boolean {
    const runtimeValue = (globalThis as any)[DEBUG_FLAG_KEY]
    if (typeof runtimeValue === 'boolean') {
        return runtimeValue
    }

    return readDebugFlagFromStorage()
}

export function setDebugEnabled(enabled: boolean): void {
    ;(globalThis as any)[DEBUG_FLAG_KEY] = enabled

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? '1' : '0')
        }
    } catch {
        // Ignore storage write errors in restricted contexts.
    }
}

function debug(...args: unknown[]): void {
    if (isDebugEnabled()) {
        console.debug('[tabcloser]', ...args)
    }
}

export default {
    debug,
    isDebugEnabled,
    setDebugEnabled,
}
