import addGroupCommand from '/js/app/commands/add_group.js'
import ungroupCommand from '/js/app/commands/ungroup.js'
import moveDomainCommand from '/js/app/commands/move_domain.js'
import toggleLockCommand from '/js/app/commands/toggle_lock.js'
import closeGroupCommand from '/js/app/commands/close_group.js'
import extractGroupCommand from '/js/app/commands/extract_group.js'
import getTabsSnapshotQuery from '/js/app/queries/get_tabs_snapshot.js'

const defaultHandlers = {
    'command:add_group': addGroupCommand,
    'command:ungroup': ungroupCommand,
    'command:move_domain': moveDomainCommand,
    'command:toggle_lock': toggleLockCommand,
    'command:close_group': closeGroupCommand,
    'command:extract_group': extractGroupCommand,
    'query:get_tabs_snapshot': getTabsSnapshotQuery,
}

function makeErrorResponse(code, message, requestId) {
    return {
        ok: false,
        requestId,
        error: {
            code,
            message,
        },
    }
}

export function createMessageRouter(customHandlers = {}) {
    const handlers = {
        ...defaultHandlers,
        ...customHandlers,
    }

    return async function routeMessage(message) {
        if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
            return makeErrorResponse('invalid_message', 'Message must be an object with a string type.', message?.requestId)
        }

        const { type, requestId } = message
        const payload = message.payload ?? {}

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
        } catch (error) {
            return makeErrorResponse('execution_failed', error?.message || 'Handler execution failed.', requestId)
        }
    }
}

const routeMessage = createMessageRouter()

export default routeMessage
