// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VaultWalletModuleConfigOptions { }

import type { WalletStorageConfig } from '@credo-ts/core'

export interface CredoVaultWalletConfig {
    endpoint: string
    apiVersion: string
    kvPath: string
    transitPath: string
}

export interface CredoVaultWalletCredentials {
    token: string;
}

export interface CredoVaultWalletStorageConfig extends WalletStorageConfig {
    type: 'vault'
    config: CredoVaultWalletConfig
    credentials: CredoVaultWalletCredentials
}


/**
 * @public
 */
export class CredoVaultWalletModuleConfig {
    private options: VaultWalletModuleConfigOptions

    public constructor(options: VaultWalletModuleConfigOptions) {
        this.options = options
    }
}
