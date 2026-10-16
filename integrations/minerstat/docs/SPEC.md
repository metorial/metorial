# Minerstat integration specification

The integration exposes the v2 developer data, account monitoring, and worker management APIs.

## Authentication

- `api_credentials`: management bearer token, monitoring access key, optional developer API key.
- `monitoring_only`: monitoring access key, optional developer API key.
- `developer_only`: developer API key for reference data, with no monitoring or management credential required.
- Management uses `Authorization: Bearer ...`; developer data uses `X-API-Key`; monitoring places the encoded access key in the request path.
- Config is empty. No opaque account identifier is needed at connection setup. No OAuth exchange or token refresh is involved.

## Registered tools

| Tool | Operation |
| --- | --- |
| `get_coins` | Read v2 coin profitability data; optional ticker and algorithm filters. |
| `get_hardware` | Read hardware benchmarks; optional GPU/ASIC and brand filters. |
| `get_pools` | Read pool metadata; optional coin and pool-type filters. |
| `list_workers` | Read all workers or a named worker; map required monitoring fields and retain the original response. |
| `get_worker_history` | Read hashrate, statistics, or activity history. Activity uses the documented `stats-activity` route and `timezone` query. |
| `get_mining_statistics` | Read group/global statistics or 24-hour logs; retain original response and keyed data. |
| `get_worker_configuration` | Read management-side worker details; optional worker, group, and customer filters. |
| `manage_worker` | Create, update, delete workers; set configuration and add/remove group membership. |
| `execute_worker_command` | Send shutdown, reboot, restart, stop, start, or custom exec commands. |
| `manage_tags` | List/create/update/delete pool and wallet address tags. |
| `manage_customers` | List/create/update/delete customer sub-accounts. |
| `manage_clocktune` | List/create/update/delete GPU overclocking profiles. |

Management tools preserve provider response bodies. HTTP errors and nonempty provider error envelopes become actionable errors with credentials removed. Required mapped response fields are validated; missing numeric readings are never converted to zero. Historical array rows are wrapped in an object with `values`, and scalar rows in an object with `value`; the original response remains available separately.

No identity endpoint is documented by the inspected APIs. Worker/customer discovery is available, but neither is presented as current-user identity. No webhook triggers, download/export tools, or balance-history tool are registered.

## Documentation and verification limits

Official source entry point: [Minerstat API](https://minerstat.com/api-docs). The current site confirms the legacy v2 coin/hardware/pool contract is retained. It directs detailed new API documentation to the signed-in developer portal. Older monitoring and management documentation is only partly retrievable; existing request contracts remain where endpoint details could not be reverified. Build and schema verification do not establish current acceptance of those historical endpoints or telemetry shapes.
