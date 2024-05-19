/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_AUTHORITY: string;
	readonly VITE_CLIENT_ID: string;
	readonly VITE_REDIRECT_URI: string;
	readonly VITE_ANONCREDS_URL: string;
	readonly VITE_API_URL: string;
	// Add other environment variables here if needed...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}