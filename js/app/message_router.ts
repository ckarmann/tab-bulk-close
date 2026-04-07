import addGroupCommand from './commands/add_group'
import ungroupCommand from './commands/ungroup'
import moveDomainCommand from './commands/move_domain'
import toggleLockCommand from './commands/toggle_lock'
import closeGroupCommand from './commands/close_group'
import extractGroupCommand from './commands/extract_group'
import getTabsSnapshotQuery from './queries/get_tabs_snapshot'
import type { RequestMessage, RouterResponse } from '../shared/contracts'

type Handler = (payload: Record<string, unknown>) => Promise<unknown>

const defaultHandlers: Record<string, Handler> = {
    'command:add_group': addGroupCommand as Handler,
    'command:ungroup': ungroupCommand as Handler,
    'command:move_domain': moveDomainCommand as Handler,
    'command:toggle_lock': toggleLockCommand as Handler,
    'command:close_group': closeGroupCommand as Handler,
    'command:extract_group': extractGroupCommand as Handler,
    'query:get_tabs_snapshot': getTabsSnapshotQuery as Handler,
}

function makeErrorResponse(code: 'invalid_message' | 'unknown_type' | 'execution_failed', message: string, requestId?: string): RouterResponse {
    return {
        ok: false,
        requestId,
        error: {
            code,
            message,
        },
    }
}

export function createMessageRouter(customHandlers: Record<string, Handler> = {}) {
    const handlers: Record<string, Handler> = {
        ...defaultHandlers,
        ...customHandlers,
    }

    return async function routeMessage(message: RequestMessage): Promise<RouterResponse> {
        if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
            return makeErrorResponse('invalid_message', 'Message must be an object with a string type.', message?.requestId)
        }

        const { type, requestId } = message
        const payload = (message.payload ?? {}) as Record<string, unknown>

        if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
            return makeErrorResponse('invalid_message', 'Message payload must be an object when provided.', requestId)
        }

        const handler = handlers[type]
        if (typeof handler !== 'function') {
            return makeErrorResponse('unknown_type', `Unsupported message type: ${type}`, requestId)
        }

        try {
            const result = await handler(payload)
            return {
                ok: true,
                requestId,
                result,
            }
        } catch (error: any) {
            return makeErrorResponse('execution_failed', error?.message || 'Handler execution failed.', requestId)
        }
    }
}

const routeMessage = createMessageRouter()

export default routeMessage