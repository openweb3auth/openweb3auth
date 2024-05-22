import { Agent, ConnectionsModule, DependencyManager, DidsModule, InjectionSymbols, KeyDerivationMethod, KeyDidRegistrar, KeyDidResolver, PeerDidResolver, WebDidResolver, type InitConfig } from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { CredoVaultWallet, CredoVaultWalletModule, type CredoVaultWalletStorageConfig } from "@openweb3auth/credo-wallet-vault"
import { DataSourceSymbol, PostgresStorageService, migrate } from "@openweb3auth/credo-storage-postgres"
import { db } from "./db";
export async function getAgent() {
	const config: InitConfig = {
		label: "My Credo Agent",
		walletConfig: {
			id: "my-wallet",
			key: "my key",
			keyDerivationMethod: KeyDerivationMethod.Argon2IInt,
			storage: {
				type: 'vault',
				config: {
					endpoint: process.env.VAULT_ENDPOINT as string,
					apiVersion: 'v1',
					kvPath: "secret",
					transitPath: "transit"
				},
				credentials: {
					token: process.env.VAULT_TOKEN as string
				},
			} as CredoVaultWalletStorageConfig
		},
		// Your agent configuration here
	};

	const dependencyManager = new DependencyManager()
	dependencyManager.registerSingleton(InjectionSymbols.Wallet, CredoVaultWallet)
	dependencyManager.registerSingleton(InjectionSymbols.StorageService, CredoVaultWallet)
	await migrate(db)
	dependencyManager.registerInstance(DataSourceSymbol, db)
	const isWalletRegistered = dependencyManager.isRegistered(InjectionSymbols.Wallet)
	console.log("isWalletRegistered", isWalletRegistered)

	const agent = new Agent(
		{
			config,
			dependencies: agentDependencies,
			modules: {
				connections: new ConnectionsModule({
					autoAcceptConnections: true,
				}),
				dids: new DidsModule({
					resolvers: [new PeerDidResolver(), new KeyDidResolver(), new WebDidResolver()],
					registrars: [new KeyDidRegistrar()],
				}),
				vault: new CredoVaultWalletModule({})
			}
		},
		dependencyManager
	);
	return agent;

}
