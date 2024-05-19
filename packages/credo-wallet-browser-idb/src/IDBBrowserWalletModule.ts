import { DependencyManager, WalletApi, WalletModule } from '@credo-ts/core'
import type { IDBBrowserWalletModuleConfigOptions } from './IDBBrowserWalletModuleConfig'

import { CredoError, InjectionSymbols } from '@credo-ts/core'

import { IDBBrowserWalletModuleConfig } from './IDBBrowserWalletModuleConfig'
import { IDBBrowserWallet } from './IDBBrowserWallet'
import { IndexedDBStorageService } from './IndexedDBStorageService'

export class IDBBrowserWalletModule implements WalletModule {
    public readonly config: IDBBrowserWalletModuleConfig
    public readonly api = WalletApi

    public constructor(config: IDBBrowserWalletModuleConfigOptions) {
        this.config = new IDBBrowserWalletModuleConfig(config)
    }

    public register(dependencyManager: DependencyManager) {
        dependencyManager.registerInstance(IDBBrowserWalletModuleConfig, this.config)

        if (dependencyManager.isRegistered(InjectionSymbols.Wallet)) {
            throw new CredoError('There is an instance of Wallet already registered')
        } else {
            dependencyManager.registerContextScoped(InjectionSymbols.Wallet, IDBBrowserWallet)
        }

        if (dependencyManager.isRegistered(InjectionSymbols.StorageService)) {
            throw new CredoError('There is an instance of StorageService already registered')
        } else {
            dependencyManager.registerSingleton(InjectionSymbols.StorageService, IndexedDBStorageService)
        }
    }
}
