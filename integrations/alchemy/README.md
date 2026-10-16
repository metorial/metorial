# <img src="logo.svg" height="20"> Alchemy

Query EVM blockchain balances, blocks, transactions, logs, and smart contracts through Alchemy. Read ERC-20 metadata and spending allowances, search historical transfers, inspect NFT holdings and ownership, and look up current token prices. Broadcast signed transactions. Legacy transaction simulation remains registered for compatibility after its provider retirement.

Configure an Alchemy API key and an EVM network identifier (default `eth-mainnet`). API availability depends on the selected network and your plan; NFT spam checks require a paid plan. Wallet tools query public blockchain addresses and do not manage private keys or identify the Alchemy account owner.

Alchemy retired its `alchemy_simulate*` APIs on September 30, 2026. The deprecated simulation tool remains for saved workflows, with its original interface. Use the contract call tool for read-only execution or gas estimation; it cannot reproduce the retired decoded asset-change breakdown. See the [provider retirement guidance](https://support.alchemy.com/articles/8324617353-what-to-use-instead-of-the-deprecated-alchemy-simulate-methods).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
