// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDBBrowserWalletModuleConfigOptions { }

/**
 * @public
 */
export class IDBBrowserWalletModuleConfig {
    private options: IDBBrowserWalletModuleConfigOptions

    public constructor(options: IDBBrowserWalletModuleConfigOptions) {
        this.options = options
    }
}
