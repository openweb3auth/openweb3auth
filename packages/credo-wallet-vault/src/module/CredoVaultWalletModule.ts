import { DependencyManager, WalletApi, WalletModule } from '@credo-ts/core'
import type { VaultWalletModuleConfigOptions } from './CredoVaultWalletModuleConfig'

import { CredoError, InjectionSymbols } from '@credo-ts/core'

import { CredoVaultWalletModuleConfig } from './CredoVaultWalletModuleConfig'
import { CredoVaultWallet } from './CredoVaultWallet'

export class CredoVaultWalletModule implements WalletModule {
    public readonly config: CredoVaultWalletModuleConfig
    public readonly api = WalletApi

    public constructor(config: VaultWalletModuleConfigOptions) {
        this.config = new CredoVaultWalletModuleConfig(config)
    }

    public register(dependencyManager: DependencyManager) {
        dependencyManager.registerInstance(CredoVaultWalletModuleConfig, this.config)

        if (dependencyManager.isRegistered(InjectionSymbols.Wallet)) {
            throw new CredoError('There is an instance of Wallet already registered')
        } else {
            dependencyManager.registerContextScoped(InjectionSymbols.Wallet, CredoVaultWallet)
        }
    }
}
