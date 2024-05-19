import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { OpenWeb3AuthClient } from '@openweb3auth/sdk-browser'
import { ec } from 'elliptic'
type OpenWeb3AuthContextType = {
	url: string
}
// Create the context
const OpenWeb3AuthContext = createContext<OpenWeb3AuthContextType>({
	url: '',
})

// Create a provider component
export const OpenWeb3AuthProvider = ({ children, url }: { url: string; children: React.ReactNode }) => {
	return (
		<OpenWeb3AuthContext.Provider
			value={{
				url,
			}}
		>
			{children}
		</OpenWeb3AuthContext.Provider>
	)
}

// Custom hook to use the OpenWeb3Auth context
export const useOpenWeb3Auth = () => {
	const context = useContext(OpenWeb3AuthContext)
	if (!context) {
		throw new Error('useOpenWeb3Auth must be used within a OpenWeb3AuthProvider')
	}
	const openweb3AuthClient = useMemo(() => {
		return new OpenWeb3AuthClient(context.url)
	}, [context.url])

	const [privateKey, setPrivateKey] = useState<ec.KeyPair | null>(null)
	const [evmAddress, setEvmAddress] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const exportPrivateKey = useCallback(() => {
		if (!privateKey) {
			return null
		}
		return privateKey.getPrivate('hex')
	}, [privateKey])
	const publicKeyHex = useMemo(() => {
		if (!privateKey) {
			return null
		}
		return privateKey.getPublic('hex')
	}, [privateKey])
	const createWallet = useCallback(async (idToken: string) => {
		setLoading(true)
		try {
			const wallet = await openweb3AuthClient.bootstrapWallet(idToken)
			setPrivateKey(wallet.privateKey)
			setEvmAddress(wallet.evmAddress)
		} finally {
			setLoading(false)
		}
	}, [])
	const loadWallet = useCallback(async (idToken: string) => {
		setLoading(true)
		try {
			const wallet = await openweb3AuthClient.getWallet(idToken)
			setPrivateKey(wallet.privateKey)
			setEvmAddress(wallet.evmAddress)
		} finally {
			setLoading(false)
		}
	}, [])
	const sign = useCallback(
		async (message: string) => {
			if (!privateKey) {
				throw new Error('Wallet not created')
			}
			const signature = privateKey.sign(message)
			// Extract r and s
			const r = signature.r.toArray('be', 32) // Convert to big-endian array
			const s = signature.s.toArray('be', 32) // Convert to big-endian array

			// Convert r and s to hexadecimal strings
			const rHex = Buffer.from(r).toString('hex')
			const sHex = Buffer.from(s).toString('hex')

			// Combine r and s if necessary
			return rHex + sHex
		},
		[privateKey]
	)
	const verify = useCallback(
		async (message: string, signature: string) => {
			if (!privateKey) {
				throw new Error('Wallet not created')
			}
			return privateKey.verify(message, signature)
		},
		[privateKey]
	)
	return {
		createWallet,
		loadWallet,
		sign,
		verify,
		loading,
		evmAddress,
		publicKeyHex,
		exportPrivateKey,
		success: !!evmAddress && !!publicKeyHex,
	}
}
