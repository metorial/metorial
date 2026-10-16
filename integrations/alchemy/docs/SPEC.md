# Alchemy integration

## Authentication and scope

Use an Alchemy application API key from the [dashboard](https://dashboard.alchemy.com). Node and NFT requests use the key in the documented endpoint path; price requests use the documented Bearer header. `network` is a tool configuration setting and defaults to `eth-mainnet`. Only Alchemy network identifiers are accepted as hostnames. API coverage depends on the network and plan.

This integration exposes EVM Node, Token, Transfers, NFT, and Prices APIs. It does not expose smart-wallet management, gas sponsorship, historical prices, sales history, webhook administration, or non-EVM node APIs. Application API keys do not provide a suitable account-profile endpoint; the network-info tool identifies the blockchain endpoint, not the credential owner.

## Tools

| API | Tools |
| --- | --- |
| Node | Network info, block info, wallet balance, transaction details and receipt, event logs, contract calls, gas estimation, signed transaction broadcast |
| Token | ERC-20 balances, token metadata, spender allowances |
| Transfers | Historical transfers with filtering and provider page keys |
| NFT | Wallet holdings, individual NFT metadata, owners by token or contract, optional paid-plan spam check |
| Prices | Current token prices by address/network |
| Legacy simulation | Original simulation tool retained and marked deprecated |

List tools return the provider page key for subsequent requests where supported. NFT page sizes are validated as integers from 1 to 100 without narrowing the stored tool schema. Transfer `maxCount` remains a hex string and is validated against the provider maximum of 1000. Native balances use integer arithmetic to preserve all 18 decimal places. Missing required response arrays or identifiers fail with a service error. Optional unavailable metadata is omitted from scalar fields; additive raw fields retain original provider nulls and metadata. Credentials are removed from public data and errors.

Alchemy [retired the legacy simulation methods on September 30, 2026](https://support.alchemy.com/articles/8324617353-what-to-use-instead-of-the-deprecated-alchemy-simulate-methods). The original input/output schemas and handler remain unchanged for compatibility. There is no equivalent decoded asset-change replacement. The contract-call tool performs a read-only call or gas estimation only. The retired handler can suppress rejected simulation requests; its legacy success output must not be used as a transaction safety guarantee.

## Provider references

- [Ethereum API overview](https://www.alchemy.com/docs/ethereum/ethereum-api-overview)
- [Token balances](https://www.alchemy.com/docs/data/token-api/token-api-endpoints/alchemy-get-token-balances)
- [Token metadata](https://www.alchemy.com/docs/data/token-api/token-api-endpoints/alchemy-get-token-metadata)
- [Token allowance](https://www.alchemy.com/docs/data/token-api/token-api-endpoints/alchemy-get-token-allowance)
- [Asset transfers](https://www.alchemy.com/docs/data/transfers-api/transfers-endpoints/alchemy-get-asset-transfers)
- [NFT endpoints](https://www.alchemy.com/docs/reference/nft-api-endpoints)
- [Prices quickstart](https://www.alchemy.com/docs/reference/prices-api-quickstart)
