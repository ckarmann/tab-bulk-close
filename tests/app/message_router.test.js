import { describe, expect, it, vi } from 'vitest'

import { createMessageRouter } from '/js/app/message_router.js'

describe('message router', () => {
    it('returns invalid_message when message shape is invalid', async () => {
        const router = createMessageRouter()

        const result = await router(null)

        expect(result).toEqual({
            ok: false,
            requestId: undefined,
            error: {
                code: 'invalid_message',
                message: 'Message must be an object with a string type.',
            },
        })
    })

    it('returns invalid_message when payload is not an object', async () => {
        const router = createMessageRouter()

        const result = await router({
            type: 'command:add_group',
            payload: 'bad-payload',
            requestId: 'r1',
        })

        expect(result).toEqual({
            ok: false,
            requestId: 'r1',
            error: {
                code: 'invalid_message',
                message: 'Message payload must be an object when provided.',
            },
        })
    })

    it('returns unknown_type for unsupported message type', async () => {
        const router = createMessageRouter()

        const result = await router({
            type: 'query:get_tabs_snapshot',
            payload: {},
            requestId: 'r2',
        })

        expect(result).toEqual({
            ok: false,
            requestId: 'r2',
            error: {
                code: 'unknown_type',
                message: 'Unsupported message type: query:get_tabs_snapshot',
            },
        })
    })

    it('dispatches to configured handler and returns result', async () => {
        const handler = vi.fn().mockResolvedValue({ ok: true, command: 'done' })
        const router = createMessageRouter({
            'command:add_group': handler,
        })

        const result = await router({
            type: 'command:add_group',
            payload: { newGroupName: 'Work' },
            requestId: 'r3',
        })

        expect(handler).toHaveBeenCalledWith({ newGroupName: 'Work' })
        expect(result).toEqual({
            ok: true,
            requestId: 'r3',
            result: { ok: true, command: 'done' },
        })
    })

    it('uses empty payload object when payload is omitted', async () => {
        const handler = vi.fn().mockResolvedValue({ ok: true })
        const router = createMessageRouter({
            'command:toggle_lock': handler,
        })

        const result = await router({
            type: 'command:toggle_lock',
            requestId: 'r4',
        })

        expect(handler).toHaveBeenCalledWith({})
        expect(result).toEqual({
            ok: true,
            requestId: 'r4',
            result: { ok: true },
        })
    })

    it('returns execution_failed when handler throws', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('boom'))
        const router = createMessageRouter({
            'command:close_group': handler,
        })

        const result = await router({
            type: 'command:close_group',
            payload: { groupName: 'Work' },
            requestId: 'r5',
        })

        expect(result).toEqual({
            ok: false,
            requestId: 'r5',
            error: {
                code: 'execution_failed',
                message: 'boom',
            },
        })
    })
})
