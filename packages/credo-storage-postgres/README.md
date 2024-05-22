# credo-wallet-vault

To install dependencies:

```bash
bun install @openweb3auth/credo-wallet-vault
```

This project was created using `bun init` in bun v1.1.8. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

In the `InitConfig` of credo, you need to set the storage property:

```typescript
			storage: {
				type: 'vault',
				config: {
					endpoint: "http://localhost:8200",
					apiVersion: 'v1',
				},
				credentials: {
					token: "<my_vault_token>",
				},
			}
```


And in the modules, add the following:

```typescript
modules: {
   vault: new VaultWalletModule({})
}
```