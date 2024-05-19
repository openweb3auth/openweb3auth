import { Agent, ConsoleLogger, LogLevel, WsOutboundTransport, type InitConfig } from '@credo-ts/core'
import AgentProvider from '@credo-ts/react-hooks'
import { useOpenWeb3Auth } from '@openweb3auth/react'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import type { AgentModulesInput } from '@credo-ts/core/build/agent/AgentModules'
import { HttpOutboundTransport } from './HttpOutboundTransport.ts'
import { agentDependencies } from './agentDependencies.ts'
import { hasMediationConfigured, setupMediationWithDid, useMessagePickup } from './mediator.ts'

interface CredoContextValue {
	agent: Agent<AgentModulesInput> | undefined
	setAgent: React.Dispatch<React.SetStateAction<Agent<AgentModulesInput> | undefined>>
	initializeAgent: (agentId: string, agentLabel: string, password: string) => Promise<void>
}
// Create a new context for Credo
const CredoContext = createContext<CredoContextValue>({
	agent: undefined,
	setAgent: () => {},
	initializeAgent: (agentId: string, agentLabel: string, password: string) => Promise.resolve(),
})

interface CredoProviderProps {
	children: React.ReactNode
	modules: AgentModulesInput
	mediatorDid?: string
}
const useCredo = () => {
	const credoContext = useContext(CredoContext)
	if (credoContext === undefined) {
		throw new Error('useCredo must be used within a CredoProvider')
	}
	return credoContext
}

const CredoProvider = ({ children, mediatorDid, modules }: CredoProviderProps) => {
	const [agent, setAgent] = useState<Agent<typeof modules>>()
	const { exportPrivateKey } = useOpenWeb3Auth()
	const initializeAgent = useCallback(
		async (agentId: string, agentLabel: string, password: string) => {
			console.log('Initializing agent', password)
			const config: InitConfig = {
				label: agentLabel,
				walletConfig: {
					id: agentId,
					key: password,
				},
				logger: new ConsoleLogger(LogLevel.trace),
				autoUpdateStorageOnStartup: true,
			}
			const credoAgent = new Agent({
				config,
				dependencies: agentDependencies,
				modules: modules,
			})
			credoAgent.registerOutboundTransport(new WsOutboundTransport())
			credoAgent.registerOutboundTransport(new HttpOutboundTransport())
			await credoAgent.initialize()
			setAgent(credoAgent)
		},
		[setAgent, exportPrivateKey, modules]
	)
	const [isMediationConfigured, setIsMediationConfigured] = useState(false)
	const [isSettingUpMediation, setIsSettingUpMediation] = useState(false)
	useEffect(() => {
		if (!agent) return
		if (!mediatorDid) return
		if (isMediationConfigured) return
		if (isSettingUpMediation) return

		setIsSettingUpMediation(true)

		void hasMediationConfigured(agent!, mediatorDid)
			.then(async (mediationConfigured) => {
				if (!mediationConfigured) {
					console.log('Mediation not configured yet.')
					await setupMediationWithDid(agent!, mediatorDid)
				}
				console.info('Mediation configured. Youre ready to go!')
				setIsMediationConfigured(true)
			})
			.finally(() => {
				setIsSettingUpMediation(false)
			})
	}, [agent!, isMediationConfigured, mediatorDid, isSettingUpMediation])

	useMessagePickup({
		isEnabled: isMediationConfigured,
		agent: agent!,
		mediatorDid,
	})
	// Provide the CredoContext value to its children
	return <CredoContext.Provider value={{ agent, setAgent, initializeAgent }}>{children}</CredoContext.Provider>
}

export { CredoContext, CredoProvider, useCredo }
