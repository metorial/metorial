# Storeganise integration specification

## Connection

Use an Admin API key created under Main Settings > Developer. Requests use `Authorization: ApiKey <key>` and the tenant base URL `https://{subdomain}.storeganise.com/api/v1`. The required business code is the known portal subdomain, not an opaque resource ID. The API key belongs to authentication; the business code belongs to connection configuration. No OAuth scopes or refresh flow apply to this connection.

[Developer settings](https://help.storeganise.com/article/33-developer-settings) describes API-key creation and roles. Full Admin API documentation requires requesting access from Storeganise; the public [API FAQ](https://help.storeganise.dev/article/21-api-faq) distinguishes its customer API reference from the Admin API.

## Tools

| Area | Tools |
| --- | --- |
| Sites and units | `list_sites`, `get_site`, `list_units`, `get_unit` |
| Customers | `list_users`, `get_user`, `create_user`, `update_user` |
| Invoices | `list_invoices`, `get_invoice`, `create_invoice`, `manage_invoice` |
| Rentals | `list_unit_rentals`, `get_unit_rental` |
| Jobs and orders | `manage_move_in`, `manage_move_out`, `manage_valet_order` |
| Leads and settings | `manage_lead`, `get_settings` |

List tools expose one provider response page. Continue with `limit` and `offset` where those inputs are available. User and invoice lists accept comma-separated `ids` batches of up to 50. `updatedAfter` is available on the existing synchronization list tools. Avoid large related-record includes; fetch related data for individual records instead, following [API best practices](https://help.storeganise.com/article/297-api-best-practices).

The public `list_unit_rentals.userId` input maps to the provider's `ownerId` query filter. `get_unit_rental` calls `GET /admin/unit-rentals/{id}` with optional `include`; documented examples include `unit,owner,customFields`. These operations are shown in the official [Sensorberg example](https://help.storeganise.com/article/299-integration-example-case-study-sensorberg) and [Add-on technical reference](https://help.storeganise.com/article/475-add-on-technical-reference).

Consolidated manage tools retain their action enums and require the fields relevant to the selected action at invocation time. User, invoice, rental, job, order, lead, site, unit, and settings data remain provider records without invented fallback fields. Existing output shapes and optionalness are preserved.

## Reliability and scope

HTTP failures use provider error details and status in user-facing errors. Requests have a 30-second timeout. Resource identifiers and email lookups are encoded as URL path segments.

There are no event triggers or downloadable-file tools. This integration does not expose site creation, unit creation, unit transfers, recurring-billing configuration, or webhook monitoring. The public customer `/auth/userinfo` documentation does not establish an Admin API-key identity endpoint, so no identity operation is inferred from it.
