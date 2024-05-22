import {
	Buffer,
	InjectionSymbols,
	JsonEncoder,
	Key,
	KeyType,
	TypedArrayEncoder,
	WalletError,
	type EncryptedMessage,
	type Logger,
	type UnpackedMessageContext,
	type Wallet,
	type WalletConfig,
	type WalletConfigRekey,
	type WalletCreateKeyOptions,
	type WalletExportImportConfig,
	type WalletSignOptions,
	type WalletVerifyOptions
} from "@credo-ts/core";
import { inject, injectable } from "tsyringe"
import { verify } from "@stablelib/ed25519";
import { createHash, randomBytes } from 'crypto';
import { DIDComm } from "encryption-envelope-js";
import sodium from 'libsodium-wrappers';
import GetVaultClient from "node-vault";
import { v4 } from "uuid";
import type { CredoVaultWalletStorageConfig } from "./CredoVaultWalletModuleConfig";

const hashPublicKeyBase58 = (publicKeyBase58: string) => {
	const hash = createHash('sha256');
	hash.update(publicKeyBase58);
	return hash.digest('hex');
}

@injectable()
export class CredoVaultWallet implements Wallet {
	supportedKeyTypes: KeyType[] = [KeyType.Ed25519, KeyType.P256, KeyType.P384, KeyType.P521]

	private logger: Logger;
	public walletConfig?: WalletConfig;
	private _vault: GetVaultClient.client | null = null;
	private _kvPath?: string;
	private _transitPath?: string;

	public get isProvisioned() {
		return this.walletConfig !== undefined
	}
	public get isInitialized() {
		return !!this._vault && !!this._kvPath && !!this._transitPath
	}
	public constructor(
		@inject(InjectionSymbols.Logger) logger: Logger,
	) {
		this.logger = logger
	}

	async create(walletConfig: WalletConfig): Promise<void> {
		this.walletConfig = walletConfig
		await this.init(walletConfig);
		this.logger.debug(`Invoked async create`, walletConfig)
	}
	private init(walletConfig: WalletConfig) {
		const storageConfig = walletConfig.storage as unknown as CredoVaultWalletStorageConfig
		const options: GetVaultClient.VaultOptions = {
			apiVersion: storageConfig.config.apiVersion,
			endpoint: storageConfig.config.endpoint,
			token: storageConfig.credentials.token
		};
		const vault = GetVaultClient(options)
		this._kvPath = storageConfig.config.kvPath
		this._transitPath = storageConfig.config.transitPath
		this._vault = vault
	}
	async createAndOpen(walletConfig: WalletConfig): Promise<void> {
		this.walletConfig = walletConfig
		await this.init(walletConfig);
		this.logger.debug(`Invoked async createAndOpen`, walletConfig)
	}
	async open(walletConfig: WalletConfig): Promise<void> {
		this.logger.debug(`Invoked async open`, walletConfig)
		this.walletConfig = walletConfig
		await this.init(walletConfig);
		this.logger.debug(`Finish: Invoked async open`, walletConfig)
	}
	async rotateKey(walletConfig: WalletConfigRekey): Promise<void> {
		this.logger.debug(`Invoked async rotateKey`, walletConfig)
	}
	async close(): Promise<void> {
		this.logger.debug(`Invoked async close`)
	}
	async delete(): Promise<void> {
		this.logger.debug(`Invoked async delete`)
	}
	async export(exportConfig: WalletExportImportConfig): Promise<void> {
		this.logger.debug(`Invoked async export`, exportConfig)
	}
	async import(walletConfig: WalletConfig, importConfig: WalletExportImportConfig): Promise<void> {
		this.logger.debug(`Invoked async import`, { walletConfig, importConfig })
	}
	async createKey(options: WalletCreateKeyOptions): Promise<Key> {
		if (!this.isInitialized) {
			throw new WalletError('Wallet is not initialized')
		}
		if (!this.isProvisioned) {
			throw new WalletError('Wallet is not provisioned')
		}
		this.logger.debug(`Invoked async createKey`, options)
		const mapType = {
			[KeyType.P256]: "ecdsa-p256",
			[KeyType.P384]: "ecdsa-p384",
			[KeyType.P521]: "ecdsa-p521",
			[KeyType.Ed25519]: "ed25519"
		}
		const type = mapType[options.keyType as keyof typeof mapType]
		const keyName = v4()

		const res = await this._vault!.write(`${this._transitPath}/keys/${keyName}`, {
			"type": type,
			"name": keyName,
			"auto_rotate_period": "0",
			"deletion_allowed": false,
			"derived": false,
			"exportable": true,
			"min_decryption_version": 1,
			"min_encryption_version": 0,
			"latest_version": null,
			"keys": {},
			"convergent_encryption": false,
			"convergent_encryption_version": null,
			"supports_signing": true,
			"supports_encryption": false,
			"supports_decryption": false,
			"supports_derivation": false,
			"backend": "transit"
		})

		const keyData = await this._vault!.read(`/${this._transitPath}/keys/${keyName}`)
		const vaultKey = keyData.data.keys['1']
		let publicKeyBase58 = ""
		let fingerprint = ""
		let key: Key
		switch (options.keyType) {
			case KeyType.Ed25519:
				key = Key.fromPublicKey(TypedArrayEncoder.fromBase64(vaultKey.public_key), options.keyType)
				publicKeyBase58 = key.publicKeyBase58
				fingerprint = key.fingerprint
				break;
			default:
				throw new Error(`Unsupported key type ${options.keyType}`)
		}
		const publicKeyHashed = hashPublicKeyBase58(publicKeyBase58)
		await this._vault!.write(`${this._kvPath}/data/${publicKeyHashed}`, {
			data: {
				keyName,
				publicKeyBase58: publicKeyBase58,
				fingerprint: fingerprint,
				keyType: options.keyType,
			},
			options: {
				cas: 0
			}
		})
		this.logger.debug(`Created key`, key)
		return key
	}

	async sign(options: WalletSignOptions): Promise<Buffer> {
		if (!this.isInitialized) {
			throw new WalletError('Wallet is not initialized')
		}
		if (!this.isProvisioned) {
			throw new WalletError('Wallet is not provisioned')
		}
		const keyName = hashPublicKeyBase58(options.key.publicKeyBase58)
		const resultSecret = await this._vault!.read(`/${this._kvPath}/data/${keyName}?version=1`)
		const data = options.data.toString('base64')
		const res = await this._vault!.write(`${this._transitPath}/sign/${resultSecret.data.data.keyName}`, {
			"hash_algorithm": "sha2-256",
			"input": data,
			"prehashed": false,
			"marshaling_algorithm": "jws"
		})
		const signatureBase64 = res.data.signature.replace("vault:v1:", "")
		const signature = TypedArrayEncoder.fromBase64(signatureBase64)
		return signature
	}
	async verify(options: WalletVerifyOptions): Promise<boolean> {
		return verify(options.key.publicKey, options.data as Buffer, options.signature as Buffer)
	}

	async pack(payload: Record<string, unknown>, recipientKeys: string[], senderVerkey?: string): Promise<EncryptedMessage> {
		const didComm = new DIDComm()
		await didComm.Ready

		const key: sodium.KeyPair | undefined = senderVerkey ? await this.getKeyPair(senderVerkey) as sodium.KeyPair : undefined
		const message = didComm.packMessage(
			JSON.stringify(payload),
			recipientKeys.map(k => {
				return Key.fromPublicKeyBase58(k, KeyType.Ed25519).publicKey;
			}),
			key
		)
		return JSON.parse(message) as EncryptedMessage
	}
	private async getKeyPair(publicKeyB58: string) {
		if (!this.isInitialized) {
			throw new WalletError('Wallet is not initialized')
		}
		if (!this.isProvisioned) {
			throw new WalletError('Wallet is not provisioned')
		}
		const keyName = hashPublicKeyBase58(publicKeyB58)
		const resultKeyInfo = await this._vault!.read(`/${this._kvPath}/data/${keyName}?version=1`)
		const resultSecretPrivateKey = await this._vault!.read(`/${this._transitPath}/export/signing-key/${resultKeyInfo.data.data.keyName}`)
		const resultSecret = await this._vault!.read(`/${this._transitPath}/keys/${resultKeyInfo.data.data.keyName}`)
		const publicKeyB64 = resultSecret.data.keys["1"].public_key
		const privateKeyB64 = resultSecretPrivateKey.data.keys["1"]
		const didComm = new DIDComm()
		await didComm.Ready
		const privateKeyBuffer = Buffer.from(privateKeyB64, "base64")
		const publicKeyBuffer = Buffer.from(publicKeyB64, "base64")
		return {
			keyType: KeyType.Ed25519,
			privateKey: privateKeyBuffer,
			publicKey: publicKeyBuffer,
		}
	}
	async unpack(encryptedMessage: EncryptedMessage): Promise<UnpackedMessageContext> {
		const didComm = new DIDComm()
		await didComm.Ready
		const protectedJson = JsonEncoder.fromBase64(encryptedMessage.protected)
		for (const recip of protectedJson.recipients) {
			const kid = recip.header.kid
			if (!kid) {
				throw new WalletError('Blank recipient key')
			}
			const key = await this.getKeyPair(kid)
			if (!key) {
				throw new WalletError(`Key not found for ${kid}`)
			}
			const unpackedMessage = await didComm.unpackMessage(
				JSON.stringify(encryptedMessage),
				{
					keyType: KeyType.Ed25519,
					privateKey: key.privateKey,
					publicKey: key.publicKey,
				},
			)
			return {
				plaintextMessage: JSON.parse(unpackedMessage.message),
				senderKey: unpackedMessage.senderKey,
				recipientKey: unpackedMessage.recipientKey,
			}
		}
		return undefined as unknown as UnpackedMessageContext
	}
	async generateWalletKey(): Promise<string> {
		return "walletKey";
	}
	dispose(): void | Promise<void> {
		this.logger.debug(`Invoked async dispose`)
	}
	async generateNonce(): Promise<string> {
		return randomBytes(16).toString('base64')
	}
}
