import { Agent, ConnectionService, CredoError, MediatorPickupStrategy, MessageSender, OutOfBandRole, OutboundMessageContext, type OutboundWebSocketClosedEvent, TransportEventTypes } from '@credo-ts/core'
import { useEffect } from 'react'

type AppAgent = Agent<any>
/**
 * Check whether a default mediator is configued
 */
export async function hasMediationConfigured(agent: AppAgent, mediatorDid: string) {
	const mediationRecord = await agent.mediationRecipient.findDefaultMediator()
	if (mediationRecord) {
		const { didDocument } = await agent.dids.resolve(mediatorDid)
		const services = didDocument?.getServicesByType('did-communication')
		const hostEndpoint = new URL(mediationRecord!.endpoint!).host
		const isSameEndpoint = services?.find((i) => new URL(i.serviceEndpoint).host === hostEndpoint)
		return !!isSameEndpoint
	}

	return mediationRecord !== null
}

/**
 * Create connection to mediator and request mediation.
 *
 * This connects based on a did
 */
export async function setupMediationWithDid(agent: AppAgent, mediatorDid: string) {
	const invitationsByMediator = await agent.oob.findAllByQuery({
		invitationId: mediatorDid,
		role: OutOfBandRole.Receiver,
	})
	if (invitationsByMediator.length > 1) {
		// delete all invitations
		await Promise.all(invitationsByMediator.map((i) => agent.oob.deleteById(i.id)))
	}

	const outOfBandRecord = await agent.oob.findByReceivedInvitationId(mediatorDid!)
	let [connection] = outOfBandRecord ? await agent.connections.findAllByOutOfBandId(outOfBandRecord.id) : []
	console.log('connection exists', !!connection)
	if (!connection) {
		agent.config.logger.debug('Mediation connection does not exist, creating connection')
		// We don't want to use the current default mediator when connecting to another mediator
		const routing = await agent.mediationRecipient.getRouting({ useDefaultMediator: false })
		// await agent.oob.findAllByQuery({

		// })
		agent.config.logger.debug('Routing created', routing)
		const { connectionRecord: newConnection } = await agent.oob.receiveImplicitInvitation({
			did: mediatorDid!,
			routing,
		})
		agent.config.logger.debug('Mediation invitation processed', { mediatorDid: mediatorDid })

		if (!newConnection) {
			throw new CredoError('No connection record to provision mediation.')
		}

		connection = newConnection
	}

	const readyConnection = connection.isReady ? connection : await agent.connections.returnWhenIsConnected(connection.id)

	return agent.mediationRecipient.provision(readyConnection)
}

/**
 * Initiate message pickup from the mediator.
 */
async function initiateMessagePickup(agent: AppAgent) {
	agent.config.logger.info('Initiating message pickup from mediator')

	// Iniate message pickup from the mediator. Passing no mediator, will use default mediator
	await agent.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.Implicit)
}

async function periodicPingMediator(agent: AppAgent, mediatorDid: string) {
	const connectionService = agent.dependencyManager.resolve(ConnectionService)
	const messageSender = agent.dependencyManager.resolve(MessageSender)
	const websocketSchemes = ['ws', 'wss']
	const outOfBandRecord = await agent.oob.findByReceivedInvitationId(mediatorDid!)
	const [connection] = outOfBandRecord ? await agent.connections.findAllByOutOfBandId(outOfBandRecord.id) : []
	const int = setInterval(async () => {
		const { message, connectionRecord } = await connectionService.createTrustPing(agent.context, connection, {
			responseRequested: true,
		})
		agent.config.logger.info('Sending trust ping to mediator', message)

		await messageSender.sendMessage(new OutboundMessageContext(message, { agentContext: agent.context, connection: connectionRecord }), {
			transportPriority: {
				schemes: websocketSchemes,
				restrictive: true,
				// TODO: add keepAlive: true to enforce through the public api
				// we need to keep the socket alive. It already works this way, but would
				// be good to make more explicit from the public facing API.
				// This would also make it easier to change the internal API later on.
				// keepAlive: true,
			},
		})
	}, 1000 * 30) // 30 seconds
	return () => clearInterval(int)
}

/**
 * Stop message pickup from the mediator.
 */
async function stopMessagePickup(agent: AppAgent) {
	agent.config.logger.info('Stopping message pickup from mediator')

	// Stop message pickup. Will stopp all message pickup, not just from the mediator
	await agent.mediationRecipient.stopMessagePickup()
}

/**
 * Hook to enable message pickup from the mediator.
 *
 * You can use the `isEnabled` config property to enable/disable message pickup.
 * This is useful if e.g. there's no internet connection, or mediation has not been setup yet
 */
export function useMessagePickup({ isEnabled = true, agent, mediatorDid }: { isEnabled?: boolean; agent?: AppAgent, mediatorDid?: string }) {
	
	useEffect(() => {
		if (!mediatorDid) return
		// If no agent, do nothing
		if (!agent) return
		// Do not pickup messages if not enabled
		if (!isEnabled) return

		agent.config.logger.info('Initiating message pickup.')
		agent.events.observable<OutboundWebSocketClosedEvent>(TransportEventTypes.OutboundWebSocketClosedEvent).subscribe({
			next: (e) => {
				agent.config.logger.info('OutboundWebSocketClosedEvent', e)
				// If the websocket is closed, we want to stop message pickup
				void stopMessagePickup(agent)
			},
		})
		let cleanup: () => void = () => { }
		periodicPingMediator(agent, mediatorDid)
			.then((c) => {
				agent.config.logger.info('Ping mediator started')
				cleanup = c
			})
			.catch((e) => {
				agent.config.logger.error('Failed to ping mediator', e)
			})
		void initiateMessagePickup(agent)

		// Stop message pickup when component unmounts
		return () => {
			void stopMessagePickup(agent)
			cleanup()
		}
	}, [isEnabled, agent])
}
