import type { AgentDependencies } from '@credo-ts/core'

import EventEmitter from 'event-emitter'
import { WebInMemoryFileSystem } from './WebInMemoryFileSystem'
const WebSocket = window.WebSocket as unknown as AgentDependencies['WebSocketClass']

const agentDependencies: AgentDependencies = {
	FileSystem: WebInMemoryFileSystem,
	fetch: window.fetch.bind(window),
	EventEmitterClass: EventEmitter as any,
	WebSocketClass: WebSocket,
}

export { agentDependencies }
