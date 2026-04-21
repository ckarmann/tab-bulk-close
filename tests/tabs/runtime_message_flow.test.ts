import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    renderTabsViewSpy,
    filtersInitSpy,
    tabsServiceSetValueSpy,
    runtimeSendMessageSpy,
} = vi.hoisted(() => ({
    renderTabsViewSpy: vi.fn(),
    filtersInitSpy: vi.fn(),
    tabsServiceSetValueSpy: vi.fn().mockResolvedValue(undefined),
    runtimeSendMessageSpy: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('/js/ui/renderers/tabs_renderer.ts', () => ({
    default: (...args) => renderTabsViewSpy(...args),
}))

vi.mock('/js/tabs_service.ts', () => ({
    default: {
        getAllTabs: vi.fn().mockResolvedValue([]),
        setTabValue: (...args) => tabsServiceSetValueSpy(...args),
    },
}))
vi.mock('/js/filters.ts', () => ({
    default: {
        state: {},
        init: (...args) => filtersInitSpy(...args),
    },
}))
async function loadTabsAndCaptureMessageListener() {
    vi.resetModules()

    renderTabsViewSpy.mockReset()
    filtersInitSpy.mockReset()
    runtimeSendMessageSpy.mockReset()
    runtimeSendMessageSpy.mockResolvedValue({ ok: true })

    const runtimeMessageListeners = []
    const domEventListeners = {}
    const linkElement = {
        textContent: 'Old title',
        scrollIntoView: vi.fn(),
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn().mockReturnValue(false),
        },
    }
    const querySelectorSpy = vi.fn(() => linkElement)

    const addGroupInput = { value: 'Work' }

    globalThis.document = {
        addEventListener: vi.fn((eventName, listener) => {
            domEventListeners[eventName] = listener
        }),
        getElementById: vi.fn(() => ({
            value: addGroupInput.value,
            innerHTML: '',
            classList: {
                contains: vi.fn().mockReturnValue(false),
                add: vi.fn(),
                remove: vi.fn(),
            },
        })),
        querySelector: querySelectorSpy,
        querySelectorAll: vi.fn().mockReturnValue([]),
        body: {
            classList: {
                contains: vi.fn().mockReturnValue(false),
                add: vi.fn(),
                remove: vi.fn(),
            },
        },
    }

    globalThis.browser = {
        runtime: {
            sendMessage: (...args) => runtimeSendMessageSpy(...args),
            onMessage: {
                addListener: vi.fn((listener) => {
                    runtimeMessageListeners.push(listener)
                }),
            },
        },
        windows: {
            onFocusChanged: { addListener: vi.fn() },
            update: vi.fn(),
        },
        tabs: {
            onCreated: { addListener: vi.fn() },
            onRemoved: { addListener: vi.fn() },
            onActivated: { addListener: vi.fn() },
            onUpdated: { addListener: vi.fn() },
            query: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue({ id: 1, windowId: 1 }),
            update: vi.fn(),
            remove: vi.fn(),
        },
    }

    await import('/tabs/tabs.ts')

    expect(runtimeMessageListeners).toHaveLength(1)
    expect(typeof domEventListeners.click).toBe('function')
    expect(typeof domEventListeners.drop).toBe('function')
    return {
        listener: runtimeMessageListeners[0],
        clickListener: domEventListeners.click,
        dropListener: domEventListeners.drop,
        addGroupInput,
        runtimeSendMessageSpy,
        querySelectorSpy,
        linkElement,
    }
}

describe('tabs runtime message flow', () => {
    const snapshotRequestMatcher = {
        type: 'query:get_tabs_snapshot',
        payload: {},
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('refreshes page when receiving state_changed for tab_created', async () => {
        vi.useFakeTimers()
        const { listener } = await loadTabsAndCaptureMessageListener()

        listener({ type: 'state_changed', payload: { reason: 'tab_created' } })

        await vi.advanceTimersByTimeAsync(250)
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        vi.useRealTimers()
    })

    it('refreshes page when receiving state_changed for tab_removed', async () => {
        vi.useFakeTimers()
        const { listener } = await loadTabsAndCaptureMessageListener()

        listener({ type: 'state_changed', payload: { reason: 'tab_removed' } })

        await vi.advanceTimersByTimeAsync(250)
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        vi.useRealTimers()
    })

    it('does not refresh for unrelated messages', async () => {
        const { listener } = await loadTabsAndCaptureMessageListener()

        listener({ type: 'other_event', payload: { reason: 'tab_created' } })
        listener(null)

        expect(runtimeSendMessageSpy).not.toHaveBeenCalledWith(snapshotRequestMatcher)
    })

    it('updates displayed tab title when receiving tab_updated_title', async () => {
        const { listener, querySelectorSpy, linkElement } = await loadTabsAndCaptureMessageListener()

        listener({
            type: 'state_changed',
            payload: {
                reason: 'tab_updated_title',
                changedTabIds: [123],
                title: 'New tab title',
            },
        })

        expect(querySelectorSpy).toHaveBeenCalledWith(".switch-tabs[data-tab-id='123']")
        expect(linkElement.textContent).toBe('New tab title')
        expect(runtimeSendMessageSpy).not.toHaveBeenCalledWith(snapshotRequestMatcher)
    })

    it('does not throw when tab_updated_title target element is missing', async () => {
        const { listener, querySelectorSpy } = await loadTabsAndCaptureMessageListener()
        querySelectorSpy.mockReturnValueOnce(null)

        expect(() => {
            listener({
                type: 'state_changed',
                payload: {
                    reason: 'tab_updated_title',
                    changedTabIds: [456],
                    title: 'Ignored title',
                },
            })
        }).not.toThrow()

        expect(runtimeSendMessageSpy).not.toHaveBeenCalledWith(snapshotRequestMatcher)
    })

    it('dispatches add_group command to background on add-group click', async () => {
        const { clickListener, runtimeSendMessageSpy, addGroupInput } = await loadTabsAndCaptureMessageListener()

        addGroupInput.value = '  Work  '
        const preventDefault = vi.fn()

        clickListener({
            target: {
                id: 'add-group-button',
                classList: { contains: vi.fn().mockReturnValue(false) },
            },
            preventDefault,
        })

        await Promise.resolve()

        expect(runtimeSendMessageSpy).toHaveBeenCalledWith({
            type: 'command:add_group',
            payload: { newGroupName: '  Work  ' },
        })
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        expect(preventDefault).toHaveBeenCalled()
    })

    it('dispatches ungroup command to background on ungroup click', async () => {
        const { clickListener, runtimeSendMessageSpy } = await loadTabsAndCaptureMessageListener()
        const preventDefault = vi.fn()

        clickListener({
            target: {
                classList: {
                    contains: vi.fn((className) => className === 'ungroup-group'),
                },
                closest: vi.fn(() => ({
                    dataset: {
                        group: 'Work',
                    },
                })),
            },
            preventDefault,
        })

        await Promise.resolve()

        expect(runtimeSendMessageSpy).toHaveBeenCalledWith({
            type: 'command:ungroup',
            payload: { groupName: 'Work' },
        })
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        expect(preventDefault).toHaveBeenCalled()
    })

    it('dispatches extract_group command to background on extract click', async () => {
        const { clickListener, runtimeSendMessageSpy } = await loadTabsAndCaptureMessageListener()
        const preventDefault = vi.fn()

        clickListener({
            target: {
                classList: {
                    contains: vi.fn((className) => className === 'extract-group'),
                },
                closest: vi.fn(() => ({
                    dataset: {
                        group: 'Research',
                    },
                })),
            },
            preventDefault,
        })

        await Promise.resolve()

        expect(runtimeSendMessageSpy).toHaveBeenCalledWith({
            type: 'command:extract_group',
            payload: { group: 'Research' },
        })
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        expect(preventDefault).toHaveBeenCalled()
    })

    it('dispatches close_group command to background on close group click', async () => {
        const { clickListener, runtimeSendMessageSpy } = await loadTabsAndCaptureMessageListener()
        const preventDefault = vi.fn()

        clickListener({
            target: {
                classList: {
                    contains: vi.fn((className) => className === 'close-group'),
                },
                closest: vi.fn(() => ({
                    dataset: {
                        group: 'Work',
                    },
                })),
            },
            preventDefault,
        })

        await Promise.resolve()

        expect(runtimeSendMessageSpy).toHaveBeenCalledWith({
            type: 'command:close_group',
            payload: {
                groupName: 'Work',
                activeFilters: expect.any(Object),
            },
        })
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        expect(preventDefault).toHaveBeenCalled()
    })

    it('dispatches toggle_lock command to background on lock click', async () => {
        const { clickListener, runtimeSendMessageSpy } = await loadTabsAndCaptureMessageListener()
        const preventDefault = vi.fn()

        clickListener({
            target: {
                classList: {
                    contains: vi.fn((className) => className === 'lock'),
                },
                dataset: {
                    url: 'https://example.com',
                },
            },
            preventDefault,
        })

        await Promise.resolve()

        expect(runtimeSendMessageSpy).toHaveBeenCalledWith({
            type: 'command:toggle_lock',
            payload: { url: 'https://example.com' },
        })
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        expect(preventDefault).toHaveBeenCalled()
    })

    it('dispatches move_domain command to background on domain drop', async () => {
        const { dropListener, runtimeSendMessageSpy } = await loadTabsAndCaptureMessageListener()
        const stopPropagation = vi.fn()
        const preventDefault = vi.fn()

        dropListener({
            stopPropagation,
            preventDefault,
            target: {
                closest: vi.fn(() => ({
                    dataset: {
                        group: 'Work',
                    },
                })),
            },
            dataTransfer: {
                getData: vi.fn(() => 'example.com'),
            },
        })

        await Promise.resolve()
        await Promise.resolve()

        expect(runtimeSendMessageSpy).toHaveBeenCalledWith({
            type: 'command:move_domain',
            payload: { domain: 'example.com', newGroup: 'Work' },
        })
        expect(runtimeSendMessageSpy).toHaveBeenCalledWith(snapshotRequestMatcher)
        expect(stopPropagation).toHaveBeenCalled()
    })
})
