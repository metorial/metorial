# Beaconcha.in API specification

Beaconcha.in provides Ethereum explorer data, validator analytics, dashboard validator management, and machine monitoring history.

## Connection

Provide an API key from https://beaconcha.in/user/api-key-management. V2 requests send `Authorization: Bearer <API_KEY>`. V1 execution queries additionally send the documented `apikey` header. The network setting accepts `mainnet` (default) or `hoodi`.

Ethereum V2 queries use `POST https://beaconcha.in/api/v2/ethereum/...` and include `chain` in the JSON body. Legacy V1 execution queries and dashboard management use the selected network host (`beaconcha.in` or `hoodi.beaconcha.in`). Account machine queries use the main service without an Ethereum chain field. OAuth is not used. The public API documents no account profile endpoint; connection validation queries chain state.

## Tools

| Tool | Behavior |
| --- | --- |
| `get_network_state` | Explorer state with optional queues, validator statuses, chain config, and performance. Network performance defaults to a 24h window. |
| `get_epoch_info` | Explicit consensus epoch or latest/finalized epoch overview. |
| `get_validator_info` | Validator overview, optional APY/ROI (24h by default), and balances. Overview and balance lists have independent cursors. |
| `get_validator_rewards` | Per-validator rewards at one epoch or aggregate rewards. Aggregate defaults to all_time. |
| `get_validator_performance` | Per-validator performance at one epoch or aggregate performance (24h by default). |
| `get_validator_duties` | Upcoming duties, proposals, attestations, sync periods, deposits, withdrawals, or best maintenance window. |
| `get_validator_queues` | Validator staking queue positions and estimated processing times, with pagination. |
| `manage_dashboard_validators` | Add/move validators, bulk remove validators, or clear a group in an existing dashboard. Requires Orca. |
| `get_slot_details` | Slot overview with optional duties, deposits, and withdrawals; included lists have independent cursors. |
| `get_block_details` | Execution block overview and optional rewards. |
| `get_sync_committee` | Period overview and optional paginated assigned validators. |
| `get_execution_address` | Native and token balances with optional token pagination and gas recommendations. |
| `get_gas_prices` | Gas recommendations without requiring an unrelated address lookup. |
| `get_staking_entities` | Paginated entity/sub-entity comparisons over a fixed window (24h by default). Requires Scale or Enterprise. |
| `list_machines` | Discover the authenticated account's known monitoring machine names. |
| `get_machine_metrics` | Previously submitted system, validator-client, and beacon-node metrics over a timestamp range of at most 31 days. |

Validator selectors accept exactly one of an identifier array or dashboard ID; dashboard selectors optionally include a group ID. Public input keys and existing output shapes remain stable. Numeric slot/block/period inputs are translated to the provider selector object internally. Per-epoch list and balance queries resolve an omitted epoch through the finalized epoch overview; an unavailable epoch fails explicitly rather than inventing data.

The current API specifies 1–10 results per page. Use `paging.next_cursor` from the corresponding response and preserve all query filters while continuing. Raw response data, null values, provider numeric strings, and metadata are preserved. Dashboard add responses identify the validators actually added; provider subscription limits can cause partial additions. Delete endpoints return no response body.

## Official references

- [Getting started and authentication](https://docs.beaconcha.in/api/overview)
- [Complete V2 OpenAPI](https://docs.beaconcha.in/v3/bundled.yaml)
- [Pagination](https://docs.beaconcha.in/api/pagination)
- [Error messages](https://docs.beaconcha.in/api/error-handling)
- [Dashboard management](https://docs.beaconcha.in/api/dashboard)
- [Machine monitoring](https://docs.beaconcha.in/api/machine-metrics-overview)
- [V1 execution address balances](https://docs.beaconcha.in/api-reference/addresses/execution-address-balances)
- [V1 gas recommendations](https://docs.beaconcha.in/api-reference/gas/current-gas-price-recommendations)
