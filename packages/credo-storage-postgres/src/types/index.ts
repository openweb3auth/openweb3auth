import type { BaseRecord, Query, Wallet, WalletConfig } from "@credo-ts/core"

export type PaginatedQuery<T extends BaseRecord<any, any, any>> = Query<T> & {
	pageSize?: number
	page?: number
}


export type WalletWithConfig = {
	walletConfig: WalletConfig
} & Wallet
