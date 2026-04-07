import * as dayjsNs from '/third_party/dayjs/dayjs.js'
import * as relativeTimePluginNs from '/third_party/dayjs/plugin/relativeTime.js'

let isRelativeTimeInitialized = false

export function getDayjs() {
    const dayjsApi = typeof globalThis.dayjs === 'function'
        ? globalThis.dayjs  // already loaded via <script>
        : (typeof dayjsNs.default === 'function' ? dayjsNs.default : null) // loaded via import

    const relativeTimePlugin = typeof globalThis.dayjs_plugin_relativeTime === 'function'
        ? globalThis.dayjs_plugin_relativeTime
        : (typeof relativeTimePluginNs.default === 'function' ? relativeTimePluginNs.default : null)

    if (!dayjsApi || !relativeTimePlugin) {
        throw new Error('Day.js runtime is not initialized before use.')
    }

    if (typeof globalThis.dayjs !== 'function') {
        globalThis.dayjs = dayjsApi
    }
    if (typeof globalThis.dayjs_plugin_relativeTime !== 'function') {
        globalThis.dayjs_plugin_relativeTime = relativeTimePlugin
    }

    if (!isRelativeTimeInitialized) {
        dayjsApi.extend(relativeTimePlugin)
        isRelativeTimeInitialized = true
    }

    return dayjsApi
}
