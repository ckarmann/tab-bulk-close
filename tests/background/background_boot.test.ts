import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('/third_party/webextension-polyfill/browser-polyfill.js', () => ({}))

describe('background boot runtime safety', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        delete globalThis.dayjs
        delete globalThis.dayjs_plugin_relativeTime

        globalThis.browser = {
            runtime: {
                getURL: vi.fn(() => 'moz-extension://id/tabs/tabs.html'),
                sendMessage: vi.fn().mockResolvedValue(undefined),
                onMessage: { addListener: vi.fn() },
            },
            action: {
                onClicked: { addListener: vi.fn() },
            },
            tabs: {
                onCreated: { addListener: vi.fn() },
                onRemoved: { addListener: vi.fn() },
                onActivated: { addListener: vi.fn() },
                onUpdated: { addListener: vi.fn() },
                query: vi.fn().mockResolvedValue([]),
                get: vi.fn().mockResolvedValue({ id: 1, active: true }),
                update: vi.fn(),
                create: vi.fn(),
            },
            windows: {
                update: vi.fn(),
                onFocusChanged: { addListener: vi.fn() },
            },
            sessions: {
                setTabValue: vi.fn().mockResolvedValue(undefined),
            },
            storage: {
                local: {
                    get: vi.fn().mockResolvedValue({ groups: ['Others'], mapping: {}, lockedUrls: [] }),
                    set: vi.fn().mockResolvedValue(undefined),
                },
            },
        }
    })

    it('imports background module without dayjs globals', async () => {
        await expect(import('/js/background.ts')).resolves.toBeTruthy()
    })
})
