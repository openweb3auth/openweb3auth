import { CredoProvider } from '@openweb3auth/credo'
import { OpenWeb3AuthProvider } from '@openweb3auth/react'
import { useEffect } from 'react'
import { AuthProvider, useAuth, type AuthProviderProps } from 'react-oidc-context'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Index from './pages/Index'
import LoginCallback from './pages/LoginCallback'
import { IDBBrowserWalletModule } from '@openweb3auth/credo-wallet-browser-idb'
import { BrowserAnoncreds, RESTfulAnonCredsRegistry } from '@openweb3auth/credo-anoncreds'
import { AnonCredsCredentialFormatService, AnonCredsModule, AnonCredsProofFormatService } from '@credo-ts/anoncreds'
import {
	AgentContext,
	AutoAcceptCredential,
	AutoAcceptProof,
	ConnectionsModule,
	CredentialsModule,
	DidDocument,
	DidsModule,
	KeyDidResolver,
	MediationRecipientModule,
	MediatorPickupStrategy,
	PeerDidResolver,
	ProofsModule,
	V2CredentialProtocol,
	V2ProofProtocol,
	type DidResolutionResult,
	type DidResolver,
} from '@credo-ts/core'
import { config } from './config'

function SilentSignin({ children }: { children: React.ReactNode }) {
	const auth = useAuth()
	useEffect(() => {
		auth.signinSilent()
	}, [])
	return children
}
class CustomWebDidProvider implements DidResolver {
	supportedMethods: string[] = ['web']
	allowsCaching = false
	async resolve(_: AgentContext, did: string): Promise<DidResolutionResult> {
		const res = await fetch(`https://dev.uniresolver.io/1.0/identifiers/${encodeURIComponent(did)}`)
		const doc = (await res.json()) as unknown as DidResolutionResult
		if (!doc.didDocument) throw new Error('No did document found')
		return {
			didDocumentMetadata: doc.didDocumentMetadata,
			didResolutionMetadata: doc.didResolutionMetadata,
			didDocument: new DidDocument(doc.didDocument),
		}
	}
}
function getAgentModules() {
	const anonCredsCredentialFormatService = new AnonCredsCredentialFormatService()
	const anoncredsProofFormatService = new AnonCredsProofFormatService()

	return {
		connections: new ConnectionsModule({
			autoAcceptConnections: true,
		}),
		dids: new DidsModule({
			resolvers: [new PeerDidResolver(), new KeyDidResolver(), new CustomWebDidProvider()], // implement custom web did resolver using a proxy on the issuer
		}),
		credentials: new CredentialsModule({
			autoAcceptCredentials: AutoAcceptCredential.Always,
			credentialProtocols: [
				new V2CredentialProtocol({
					credentialFormats: [anonCredsCredentialFormatService],
				}),
			],
		}),

		proofs: new ProofsModule({
			autoAcceptProofs: AutoAcceptProof.Always,
			proofProtocols: [
				new V2ProofProtocol({
					proofFormats: [anoncredsProofFormatService],
				}),
			],
		}),
		anoncreds: new AnonCredsModule({
			registries: [new RESTfulAnonCredsRegistry(config.anoncredsUrl)],
			anoncreds: new BrowserAnoncreds(),
		}),
		mediationRecipient: new MediationRecipientModule({
			mediatorPickupStrategy: MediatorPickupStrategy.None,
		}),
		wallet: new IDBBrowserWalletModule({}),
	}
}

function App() {
	const oidcConfig: AuthProviderProps = config.auth
	return (
		<BrowserRouter basename="">
			<AuthProvider {...oidcConfig}>
				<OpenWeb3AuthProvider url={config.apiUrl}>
					<CredoProvider mediatorDid={config.mediatorDid} modules={getAgentModules()}>
						<SilentSignin>
							<Routes>
								<Route path="/" element={<Index />} />
								<Route path="/login/callback" element={<LoginCallback />} />
							</Routes>
						</SilentSignin>
					</CredoProvider>
				</OpenWeb3AuthProvider>
			</AuthProvider>
		</BrowserRouter>
	)
}
export default App
