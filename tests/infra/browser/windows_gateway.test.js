import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('/js/infra/browser/windows_gateway.js')

describe('windows_gateway', () => {
    beforeEach(() => {
        globalThis.browser = {
            windows: {
                get: vi.fn(async () => ({ id: 1 })),
                create: vi.fn(async () => ({ id: 2 })),
                update: vi.fn(async () => ({ id: 3 })),
            },
        }
    })

    it('delegates all window operations to browser.windows', async () => {
        const gateway = (await import('/js/infra/browser/windows_gateway.js')).default

        await gateway.get(10, { populate: true })
        await gateway.create({ url: 'tabs.html' })
        await gateway.update(12, { focused: true })

        expect(browser.windows.get).toHaveBeenCalledWith(10, { populate: true })
        expect(browser.windows.create).toHaveBeenCalledWith({ url: 'tabs.html' })
        expect(browser.windows.update).toHaveBeenCalledWith(12, { focused: true })
    })
})
