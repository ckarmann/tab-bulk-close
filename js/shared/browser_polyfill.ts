import browser from 'webextension-polyfill'

if (!(globalThis as any).browser) {
    ;(globalThis as any).browser = browser
}

export default browser