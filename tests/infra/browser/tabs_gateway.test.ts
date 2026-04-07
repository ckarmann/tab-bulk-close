import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('/js/infra/browser/tabs_gateway.ts')

describe('tabs_gateway', () => {
    beforeEach(() => {
        globalThis.browser = {
            tabs: {
                get: vi.fn(async () => ({ id: 1 })),
                query: vi.fn(async () => ([{ id: 2 }])),
                update: vi.fn(async () => ({ id: 3 })),
                remove: vi.fn(async () => undefined),
                move: vi.fn(async () => ([{ id: 4 }])),
            },
        }
    })

    it('delegates all tab operations to browser.tabs', async () => {
        const gateway = (await import('/js/infra/browser/tabs_gateway.ts')).default

        await gateway.get(11)
        await gateway.query({ active: true })
        await gateway.update(22, { active: true })
        await gateway.remove([33, 34])
        await gateway.move([44], { index: 0 })

        expect(browser.tabs.get).toHaveBeenCalledWith(11)
        expect(browser.tabs.query).toHaveBeenCalledWith({ active: true })
        expect(browser.tabs.update).toHaveBeenCalledWith(22, { active: true })
        expect(browser.tabs.remove).toHaveBeenCalledWith([33, 34])
        expect(browser.tabs.move).toHaveBeenCalledWith([44], { index: 0 })
    })
})
