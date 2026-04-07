import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

let initialized = false

export function getDayjs() {
    if (!initialized) {
        dayjs.extend(relativeTime)
        initialized = true
    }

    return dayjs
}