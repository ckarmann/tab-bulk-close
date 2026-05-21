import { vi } from 'vitest'

type SpyFn = ReturnType<typeof vi.fn>

type BackgroundListeners = {
    onCreated?: (tab: any) => Promise<void>
    onActivated?: (activeInfo: any) => Promise<void>
    onUpdated?: (tabId: number, changeInfo: any, tab: any) => Promise<void>
    onFocusChanged?: (windowId: number) => Promise<void>
}

type HarnessSpies = {
    runtimeSendMessageSpy: SpyFn
    getTabValueSpy: SpyFn
    setTabValueSpy: SpyFn
    tabsQuerySpy?: SpyFn
    tabsGetSpy?: SpyFn
}

export async function loadBackgroundAndCaptureListeners(spies: HarnessSpies): Promise<BackgroundListeners> {
    vi.resetModules()

    spies.getTabValueSpy.mockReset()
    spies.getTabValueSpy.mockResolvedValue(undefined)
    spies.setTabValueSpy.mockReset()
    spies.setTabValueSpy.mockResolvedValue(undefined)
    spies.runtimeSendMessageSpy.mockReset()
    spies.runtimeSendMessageSpy.mockResolvedValue(undefined)

    if (spies.tabsQuerySpy) {
        spies.tabsQuerySpy.mockReset()
        spies.tabsQuerySpy.mockResolvedValue([])
    }

    if (spies.tabsGetSpy) {
        spies.tabsGetSpy.mockReset()
        spies.tabsGetSpy.mockResolvedValue({ id: 10, active: true })
    }

    const listeners: BackgroundListeners = {}

    globalThis.browser = {
        runtime: {
            getURL: vi.fn(() => 'moz-extension://id/tabs.html'),
            sendMessage: (...args: any[]) => spies.runtimeSendMessageSpy(...args),
            onMessage: {
                addListener: vi.fn(),
            },
        },
        action: {
            onClicked: { addListener: vi.fn() },
        },
        tabs: {
            onCreated: {
                addListener: vi.fn((listener: BackgroundListeners['onCreated']) => {
                    listeners.onCreated = listener
                }),
            },
            onRemoved: { addListener: vi.fn() },
            onActivated: {
                addListener: vi.fn((listener: BackgroundListeners['onActivated']) => {
                    listeners.onActivated = listener
                }),
            },
            onUpdated: {
                addListener: vi.fn((listener: BackgroundListeners['onUpdated']) => {
                    listeners.onUpdated = listener
                }),
            },
            query: spies.tabsQuerySpy
                ? (...args: any[]) => spies.tabsQuerySpy!(...args)
                : vi.fn().mockResolvedValue([]),
            get: spies.tabsGetSpy
                ? (...args: any[]) => spies.tabsGetSpy!(...args)
                : vi.fn().mockResolvedValue({ id: 10, active: true }),
            update: vi.fn(),
            create: vi.fn(),
        },
        windows: {
            update: vi.fn(),
            onFocusChanged: {
                addListener: vi.fn((listener: BackgroundListeners['onFocusChanged']) => {
                    listeners.onFocusChanged = listener
                }),
            },
        },
        sessions: {
            getTabValue: (...args: any[]) => spies.getTabValueSpy(...args),
            setTabValue: (...args: any[]) => spies.setTabValueSpy(...args),
        },
    }

    await import('/js/background.ts')
    return listeners
}
