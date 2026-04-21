import Filters from '../../filters.ts'
import buildTabsView from '../presenters/tabs_presenter.ts'
import renderTabsView from '../renderers/tabs_renderer.ts'
import { initDragDropController } from './drag_drop_controller.ts'
import { initKeyboardController } from './keyboard_controller.ts'
import logger from '../../shared/logger.ts'

async function dispatchCommandAndRefresh(message: object, errorPrefix: string): Promise<void> {
    try {
        const response = await browser.runtime.sendMessage(message)

        if (response?.ok) {
            await requestSnapshotAndRender()
        }
    } catch (error) {
        console.error(`${errorPrefix}:`, error)
    }
}

async function moveDomainToGroup(newGroup: string, domain: string): Promise<void> {
    await dispatchCommandAndRefresh(
        {
            type: 'command:move_domain',
            payload: { domain, newGroup },
        },
        'Failed to dispatch move_domain command',
    )
}

async function toggleLock(url: string): Promise<void> {
    await dispatchCommandAndRefresh(
        {
            type: 'command:toggle_lock',
            payload: { url },
        },
        'Failed to dispatch toggle_lock command',
    )
}

async function extractGroup(group: string): Promise<void> {
    await dispatchCommandAndRefresh(
        {
            type: 'command:extract_group',
            payload: { group },
        },
        'Failed to dispatch extract_group command',
    )
}

async function closeGroup(groupName: string): Promise<void> {
    await dispatchCommandAndRefresh(
        {
            type: 'command:close_group',
            payload: {
                groupName,
                activeFilters: Filters.state || {},
            },
        },
        'Failed to dispatch close_group command',
    )
}

async function addGroup(newGroupName: string): Promise<void> {
    await dispatchCommandAndRefresh(
        {
            type: 'command:add_group',
            payload: { newGroupName },
        },
        'Failed to dispatch add_group command',
    )
}

async function ungroup(groupName: string): Promise<void> {
    await dispatchCommandAndRefresh(
        {
            type: 'command:ungroup',
            payload: { groupName },
        },
        'Failed to dispatch ungroup command',
    )
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds)
    })
}

async function requestSnapshotAndRender(delayMs = 0): Promise<void> {
    if (delayMs > 0) {
        await delay(delayMs)
    }

    try {
        const response = await browser.runtime.sendMessage({
            type: 'query:get_tabs_snapshot',
            payload: {},
        })

        if (response?.ok && response?.result?.tabsModel) {
            renderTabsView(buildTabsView(response.result.tabsModel, Filters.state || {}))
        }
    } catch (error) {
        console.error('Failed to fetch tabs snapshot:', error)
    }
}

function initClickHandling(): void {
    document.addEventListener('click', (e: MouseEvent) => {
        logger.debug('Click event', e)
        const target = e.target as HTMLElement

        if (target.id === 'add-group-button') {
            const newGroupName = (document.getElementById('add-group-name') as HTMLInputElement).value
            void addGroup(newGroupName)
        }
        else if (target.classList.contains('switch-tabs')) {
            const tabId = +target.dataset.tabId!

            browser.tabs.get(tabId).then((tab) => {
                browser.windows.update(tab.windowId!, {
                    focused: true,
                })
                browser.tabs.update(tabId, {
                    active: true,
                })
            })
        }
        else if (target.classList.contains('group-shortcut')) {
            const group = target.dataset.group!
            const groupBox = document.querySelector('.group-box[data-group="' + group + '"]')
            groupBox?.scrollIntoView()
        }
        else if (target.classList.contains('extract-group')) {
            void extractGroup((target.closest('.group-box') as HTMLElement)!.dataset.group!)
        }
        else if (target.classList.contains('ungroup-group')) {
            void ungroup((target.closest('.group-box') as HTMLElement)!.dataset.group!)
        }
        else if (target.classList.contains('close-group')) {
            void closeGroup((target.closest('.group-box') as HTMLElement)!.dataset.group!)
        }
        else if (target.classList.contains('close-tab')) {
            const tabId = +target.dataset.tabId!
            browser.tabs.remove(tabId)
        }
        else if (target.classList.contains('lock')) {
            const url = target.dataset.url!
            void toggleLock(url)
        }

        e.preventDefault()
    })
}

function initRuntimeMessageHandling(): void {
    browser.runtime.onMessage.addListener((message: any) => {
        if (message?.type === 'state_changed') {

            if (message?.payload?.reason === 'tab_created') {
                void requestSnapshotAndRender(250)
            }
            else if (message?.payload?.reason === 'tab_removed') {
                void requestSnapshotAndRender(250)
            }
            else if (message?.payload?.reason === 'tab_activated') {
                void requestSnapshotAndRender()
            }
            else if (message?.payload?.reason === 'tab_updated') {
                void requestSnapshotAndRender()
            }
            else if (message?.payload?.reason === 'tab_updated_title') {
                const tabId = message.payload.changedTabIds[0]
                const linkElement = document.querySelector(`.switch-tabs[data-tab-id='${tabId}']`)
                if (linkElement) {
                    linkElement.textContent = message.payload.title
                }
            }
        }
    })
}

export function initTabsPageController(): void {
    document.addEventListener('DOMContentLoaded', () => {
        void requestSnapshotAndRender()
    })

    initDragDropController(moveDomainToGroup)
    initClickHandling()
    initKeyboardController()
    initRuntimeMessageHandling()

    Filters.init(requestSnapshotAndRender)
}
