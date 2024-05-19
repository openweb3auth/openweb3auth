import type { OidcClientSettings } from "oidc-client-ts"

export type Config = {
	auth: OidcClientSettings
	anoncredsUrl: string
	apiUrl: string
	mediatorDid?: string
}

export const config: Config = {
	auth: {
		authority: import.meta.env.VITE_AUTHORITY,
		client_id: import.meta.env.VITE_CLIENT_ID,
		redirect_uri: import.meta.env.VITE_REDIRECT_URI,
	},
	anoncredsUrl: import.meta.env.VITE_ANONCREDS_URL,
	apiUrl: import.meta.env.VITE_API_URL,
	mediatorDid: import.meta.env.VITE_MEDIATOR_DID,
}

function validateConfig() {
	if (!config.auth.authority) {
		throw new Error('Missing OIDC authority')
	}
	if (!config.auth.client_id) {
		throw new Error('Missing OIDC client_id')
	}
	if (!config.auth.redirect_uri) {
		throw new Error('Missing OIDC redirect_uri')
	}
	if (!config.anoncredsUrl) {
		throw new Error('Missing anoncredsUrl')
	}
	if (!config.apiUrl) {
		throw new Error('Missing apiUrl')
	}

}
validateConfig()