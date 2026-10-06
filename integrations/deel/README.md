# <img src="https://provider-logos.metorial-cdn.com/deel.svg" height="20"> Deel

Read contract, workforce, organization and billing records. Create contractor contracts, submit amendments and signatures, request termination, manage contractor timesheets and invoice adjustments, and request or cancel time off. Download invoice PDFs and estimate EOR employment costs.

## Connection

Use a personal or organization API token, or OAuth 2.0. OAuth requests use both the access token and the app's client ID; token exchange and rotation use the documented form encoding. Personal and organization app types have different permissions. Organization service tokens may not expose a personal profile; use `get_current_organization` for their identity.

API requests pin stable version `2026-01-01`. Production uses `api.letsdeel.com`; sandbox preserves the demo server listed in Deel's official OpenAPI. The separate sandbox guide lists a staging host, so confirm the host appropriate to your issued sandbox credentials. OAuth authorization currently uses the documented production app host.

## Tools

| Tool | Outcome |
| --- | --- |
| `get_current_user` | Personal token/user identity |
| `get_current_organization` | Token organization ID and name |
| `list_contracts`, `get_contract` | Contract discovery, cursor paging and details |
| `create_contract` | Fixed rate, hourly PAYG, task or milestone contractor contract |
| `manage_contract` | Amendment submission, client signature or termination request |
| `list_people`, `get_person` | Workforce directory and worker personal information |
| `manage_timesheets` | List, create, read, review or delete contractor timesheets |
| `manage_invoice_adjustments` | List, create, read, review or delete adjustments |
| `manage_time_off` | Assigned policies, request paging, creation, update or cancellation |
| `list_invoices`, `list_payments` | Billing invoices and payment receipts |
| `download_invoice` | Downloadable invoice PDF |
| `list_organization_data` | Legal entities, teams and departments |
| `get_eor_country_guide`, `calculate_eor_cost` | Country hiring requirements and cost estimates |

## Workflow details

Contract creation requires an explicit compliance-document choice, legal entity/team IDs and a complete payment schedule or supported configured payment policy. Discover organization resources with `list_organization_data`. Signing requires the client's signature text. An amendment can remain pending approval/signatures, and a termination request does not prove that a contract has already ended.

Contract and payment receipt lists use cursors. Their legacy nonzero offsets are rejected because the current stable APIs do not support them. Payment receipt page size is provider-controlled; omit the legacy `limit`. Invoices default to paid records; use `status: "all"` to include unpaid invoices. Decimal strings remain strings. Legacy numeric identifiers that exceed safe numeric precision are returned as exact strings.

Invoice adjustments use the contract currency; omit the legacy per-adjustment `currencyCode`. Recurrence is sent as the provider's query parameter. Time-off requests need an assigned policy/type ID discovered with the `policies` action. New requests default to `REQUESTED`. Creation may produce multiple records; all are returned in `timeOffs`. The legacy `delete` action cancels a request and verifies its retained `CANCELED` state. It does not erase history.

EOR cost estimates require the full country name, currency and salary. This integration does not initiate payroll, transfer money, create EOR employee contracts, provision users, manage immigration, administer IT assets, or register event subscriptions.

## Official references

[Authentication](https://developer.deel.com/api/stable/authentication), [OAuth](https://developer.deel.com/api/stable/oauth), [API versioning](https://developer.deel.com/api/stable/api-versioning), [API specification](https://api.letsdeel.com/openapi/rest/definitions).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
