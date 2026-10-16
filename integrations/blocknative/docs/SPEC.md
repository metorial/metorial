# Blocknative specification

## Service availability

The [official Blocknative announcement](https://www.blocknative.com/) states that
API services would operate through June 19, 2026 and stop responding afterward.
Gas Network follows the same shutdown schedule. The
[Blob Archive documentation](https://docs.blocknative.com/data-archive/blob-archive)
separately records that archive support ended March 1, 2025.

These seven read-only tools retain their legacy contracts for compatibility.
They should not be treated as a currently available production service. Requests
have a 30-second timeout; HTTP and network failures produce service errors.
No replacement provider is selected automatically.

## Authentication

The connection stores one existing Blocknative API key; blank keys are rejected
and surrounding whitespace is removed. There is no OAuth or scope selection,
and no connection configuration is required.

Legacy gas prices, gas distribution, chains, and oracles requests send
`Authorization: <API key>`. The inherited base-fee prediction request sends
`X-Api-Key: <API key>`. Ethernow batch and blob requests do not send the key.
The [distribution reference](https://gas.network/docs/api/distribution) documents
the Authorization header and `msg` error messages. Other gas reference pages
currently redirect to the shutdown announcement or fail to load; their existing
header and response contracts remain unverified rather than being changed
speculatively.

## Tools and endpoints

Gas routes use `https://api.blocknative.com`; batch and blob routes use
`https://api.ethernow.xyz`.

| Tool | Legacy GET route | Inputs and returned data |
| --- | --- | --- |
| `estimate_gas_price` | `/gasprices/blockprices` | Optional numeric `chainId` becomes `chainid`; optional `system`, `network`, and up to five `confidenceLevels` are forwarded, with confidence levels comma-separated. Returns the gas-price response and its block estimates. `list_supported_chains` supplies chain metadata. |
| `predict_base_fee` | `/gasprices/basefee-estimates` | No inputs. Returns current Ethereum base and blob fees and the provider's per-block confidence estimates. |
| `get_gas_distribution` | `/gasprices/distribution` | No inputs. Returns the Ethereum mainnet top-N pending transaction gas-price distribution. |
| `list_supported_chains` | `/chains` | No inputs. Returns chain IDs, labels, architectures, features, icons, and system/network identifiers. |
| `list_gas_oracles` | `/oracles` | No inputs. Returns chain metadata, oracle addresses by version, RPC and explorer URLs. |
| `decode_l2_batch` | `/v1/batch/{transactionHash}` | Required L1 transaction hash; optional `batchIndex` and `includeStateDiffs` (sent as `initialStateDiffs`). Returns network, chain ID, and decoded data. |
| `get_blob` | `/v1/blob/{versionedHash}` | Required versioned hash; optional `includeData` (sent as `data`). Returns versioned hash, commitment, proof, byte counts, and provider-supplied blob data when present. |

The [Batch Decoder reference](https://docs.blocknative.com/ethernow/batch-decoder-api)
documents Optimism-family chains (Optimism, Base, Mode, Zora, Kroma, Blast),
Arbitrum, and ZKsync; pending and confirmed batches; calldata and blobdata;
frame/sequence pagination through `batchIndex`; and ZKsync state diffs through
`initialStateDiffs`, whose provider default is true. Transaction and blob hashes
are encoded as single path segments. Empty hashes produce actionable errors.

The [Blob Archive response contract](https://docs.blocknative.com/data-archive/blob-archive)
documents the full blob fields and excludes blob data for `data=false`.
`blobData` therefore retains its string type but is optional when the upstream
response omits `data`; omitted content is not replaced with an empty string.
The hexadecimal blob content remains a structured API result.

## Coverage and limits

All seven original tool keys, input JSON types and optional fields remain.
Response metrics and identifiers are returned without invented zero or empty
values. No transaction monitoring subscriptions, webhook registration, ABI
configuration, historical mempool exports, or identity lookup are implemented.
No suitable documented identity endpoint was found. New tools for the retired
service were not added. Provider acceptance, API-key validity, current response
envelopes, and runtime availability were not tested.
