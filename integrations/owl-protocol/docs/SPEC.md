# Owl Protocol Integration

## Scope and authentication

The integration covers project-scoped ERC721 collection deployment and minting, project user profiles and Safe wallets, reusable token templates, token metadata, contract metadata, and contract discovery. Authentication uses a project API key sent in the `x-api-key` header. No private key is required in the connection configuration.

The API calls use the provider's published tRPC procedure contract at `https://api.owl.build/api/trpc/`. Queries send JSON input in the `input` query parameter; mutations send a JSON request body. Successful responses expose procedure output in `result.data`. The published API declares no custom data transformer.

## Capability map

| Tools | Provider procedures | Behavior |
| --- | --- | --- |
| `get_project` | `project.get` | Identify the project and its actual default chain ID. |
| `deploy_collection` | `collection.deploy` | Deploy an ERC721 collection with royalties, token metadata URI, description, and contract metadata URI/image. |
| `mint_tokens` | `collection.erc721AutoId.mintBatch` | Mint to email addresses, user IDs, or EVM addresses using optional inline metadata or a template. Optional `wait` controls whether execution details are requested. |
| `get_token`, `update_token` | `projectToken.get`, `projectToken.patch` | Retrieve or update a project token's metadata by chain, contract address, and token ID. |
| `create_token_template`, `get_token_template`, `list_token_templates`, `update_token_template` | `projectTokenTemplate.createOrSet`, `.get`, `.list`, `.patch` | Create or retrieve reusable metadata templates; optional collection address, chain ID, and external ID can be supplied on creation. |
| `create_user`, `get_user`, `list_users` | `projectUser.createOrSet`, `.get`, `.list` | Save user profiles, retrieve chain-specific Safe wallet addresses, or discover project users. |
| `list_user_tokens` | `projectUser.listTokens` | Retrieve a user's project tokens and metadata. |
| `get_contract_metadata`, `update_contract_metadata`, `list_contracts` | `projectContractMetadata.get`, `.patch`, `.list` | Read and partially update contract metadata; list metadata records. Updates send a nested `metadata` object. |
| `list_project_contracts`, `get_contract` | `projectContract.list`, `.get` | Discover contract addresses, chain IDs, implementation names, and available deployment details. |

## Input and response behavior

Existing tool fields retain their original types and requiredness. List tools accept optional `limit`, `skip`, `orderBy`, and `order` values and return one provider page. Use increasing `skip` values to retrieve subsequent pages; no total count is inferred.

`get_user` and `list_user_tokens` require at least one user selector. If multiple selectors are supplied, email takes precedence, then external ID, then user ID. For `get_user`, an omitted chain ID resolves from the connection's configured default or the actual `project.get` response. Other existing chain-scoped tools retain their required chain ID inputs.

Minting rejects simultaneous metadata and template IDs, empty recipient arrays, and empty recipients. Metadata updates require at least one parsed metadata field. Required returned IDs, user operation hashes, and list structures are validated; malformed data produces a service error. Optional summaries omit nulls and incompatible values while original provider data remains available in `raw`.

Template get and patch responses may omit the template ID. Their summaries retain the actual requested template ID because the procedure uniquely identifies that resource. Contract metadata responses may omit chain/address; the known requested identifiers are retained. Contract metadata listing does not infer missing contract addresses; use `list_project_contracts` for deployment discovery.

User operation hashes identify submitted ERC4337 operations. Missing token details do not imply a minted token count or final transaction confirmation. Token images and other metadata URLs remain provider data.

The published SDK exports `waitForUserOperationReceiptTimeoutMs = 300000`. Mint requests with `wait: true` or an omitted `wait` therefore allow 330,000 ms: five minutes for receipt waiting plus 30 seconds for HTTP overhead. The provider's omitted-wait default is not documented here and remains unchanged in the request. Explicit `wait: false` and other API requests retain a bounded 120,000 ms timeout. Mint timeout errors include reconciliation guidance: the operation may continue; inspect the project and recipient token records using any actually available operation hash before retrying, because another mint may duplicate tokens. Successful responses and original provider data are retained; no hash or completion result is fabricated on timeout.

## Sources and verification boundary

The public [provider documentation source](https://github.com/owlprotocol/workspace-public/tree/main/docs), [`@owlprotocol/core-trpc` API declarations](https://www.npmjs.com/package/@owlprotocol/core-trpc), and [tRPC HTTP specification](https://trpc.io/docs/rpc) define the request contract. No live provider or blockchain invocation was used to verify this implementation.
