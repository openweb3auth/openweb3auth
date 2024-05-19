import { useCallback, useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
// import { OPENWEB3AUTH_URL } from '../constants'
import { useOpenWeb3Auth } from '@openweb3auth/react'
import { useCredo } from '@openweb3auth/credo'

function WalletCreation() {
	const auth = useAuth()
	const { createWallet, success, sign, exportPrivateKey, loadWallet, loading, evmAddress, publicKeyHex } = useOpenWeb3Auth()
	const { agent, initializeAgent } = useCredo()
	const [message, setMessage] = useState('')
	const [signedMessage, setSignedMessage] = useState('')
	const signMessage = useCallback(async () => {
		const signed = await sign(message)
		setSignedMessage(signed)
	}, [message, sign])
	const tryLoadWallet = useCallback(async () => {
		try {
			await loadWallet(auth.user!.id_token!)
		} catch (e) {
			console.error(e)
		}
	}, [])
	useEffect(() => {
		if (auth.user) {
			void tryLoadWallet()
		}
	}, [auth.user, tryLoadWallet])
	const createWalletCB = useCallback(async () => {
		await createWallet(auth.user!.id_token!)
	}, [auth.user, createWallet])
	const initializeAgentCB = useCallback(async () => {
		const seed = await exportPrivateKey()
		console.log('seed', seed)
		if (!seed) return
		await initializeAgent('dviejo', 'David Viejo', seed)
	}, [exportPrivateKey, initializeAgent])
	return (
		<div>
			Hello {auth.user?.profile.sub}
			{loading ? (
				<>
					<p>Loading wallet...</p>
				</>
			) : success ? (
				<>
					<div>
						<p>Your wallet is already configured</p>
						<p>Private key: {publicKeyHex}</p>
						<p>EVM address: {evmAddress}</p>
						<input
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							type="text"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
						/>
						<button
							className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
							onClick={signMessage}
						>
							Sign message
						</button>
						{signedMessage && <p>Signed message: {signedMessage}</p>}
					</div>
					<div className="my-4">
						<button
							className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
							onClick={initializeAgentCB}
						>
							Initialize agent
						</button>
						{agent && <p>Agent initialized!!</p>}
					</div>
				</>
			) : (
				<button
					className="btn btn-primary"
					onClick={async () => {
						await createWalletCB()
					}}
				>
					Create wallet
				</button>
			)}
			<button
				onClick={async () => {
					await auth.removeUser()
					await auth.signoutRedirect()
				}}
			>
				Log out
			</button>
		</div>
	)
}
function Index() {
	const auth = useAuth()

	switch (auth.activeNavigator) {
		case 'signinSilent':
			return <div>Signing you in...</div>
		case 'signoutRedirect':
			return <div>Signing you out...</div>
	}

	if (auth.isLoading) {
		return <div>Loading...</div>
	}

	// if (auth.error) {
	// 	return <div>Oops... {auth.error.message}</div>
	// }

	if (auth.isAuthenticated) {
		return <WalletCreation />
		return (
			<div>
				Hello {auth.user?.profile.sub}{' '}
				<button
					onClick={async () => {
						await auth.removeUser()
						await auth.signoutRedirect({
							post_logout_redirect_uri: 'http://localhost:5174',
						})
					}}
				>
					Log out
				</button>
			</div>
		)
	}

	return <button onClick={() => void auth.signinRedirect()}>Log in</button>
}

export default Index
