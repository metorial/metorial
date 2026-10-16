# TPSCheck Integration

The integration uses the official API at `https://api.tpscheck.uk`.
See the [API reference](https://api.tpscheck.uk/documentation/).

## Authentication

Provide the API key from your [TPSCheck profile](https://www.tpscheck.uk/profile/).
Authenticated requests use `Authorization: Token YOUR_API_KEY`. No additional
connection configuration is required. The status request does not send the key.

## Supported tools

| Tool | Provider operation | Result |
| --- | --- | --- |
| `check_number` | `POST /check?version=2` | TPS/CTPS results, validity, line details, reachability, and an available risk score |
| `batch_check` | `POST /batch?version=2` | Results for 1–100 numbers, including each number's line prefix |
| `check_credits` | `GET /credits` | Usage, remaining allowance, plan, and reset date |
| `check_status` | Public `GET /status` | Provider health status and API version |

Each checked number consumes one credit. Credit-balance requests are free.
Batch availability depends on the account plan. TPSCheck's API reference and
product guide describe different minimum paid tiers; confirm eligibility with
TPSCheck. The existing batch limit remains 100.

The number-checking tools explicitly request v2 because the API otherwise
defaults to its legacy v1 format. Existing public fields and their types remain
unchanged. Risk scores remain optional. Provider HTTP failures are returned as
service errors with the available upstream status and error details.

## Scope

This integration exposes all four concrete endpoints in the API reference.
It does not expose dashboard monitoring, audit-log exports, or webhook setup.
Those product features lack a complete public API contract in the reference.
No account-profile endpoint is documented, so no identity tool is synthesized.
