# Turso integration specification

Verified against current official Turso Cloud documentation and official Platform API/TypeScript SDK source on 2026-10-05.

## Authentication and organization selection

The Platform API is `https://api.turso.tech`, authenticated with a Platform API Bearer token. Token validation uses `GET /v1/auth/validate`; the authenticated profile and `get_current_user` use `GET /v1/user`. `list_organizations` exposes stable organization slugs and display names. Scoped tools accept optional `organizationSlug`; a legacy saved organization remains a fallback for existing connections. No organization is selected automatically for a mutation.

New Platform tokens should be organization-scoped. Group-scoped Platform tokens require organization, group and scopes. Unrestricted tokens are deprecated, but existing tokens continue to work. Database/group SQL tokens have a separate purpose and authenticate database hosts, not the Platform API.

## Capabilities and routes

- Databases: v1 organization-scoped list/create/get/delete/configuration/usage/stats/instances and SQL-token creation/rotation. List accepts group and parent filters. Configuration includes size, read/write blocking, delete protection, IP/VPC restrictions and legacy ATTACH. Empty restriction lists clear those restrictions; omission leaves them unchanged.
- Groups: v1 list/create/get/delete, SQL-token creation/rotation, transfer, unarchive and grandfathered replica-location add/remove. Removing the primary location is rejected before mutation. A group transfer includes every database and revokes group-scoped Platform tokens under Turso's policy.
- Organizations: v1 retrieval, usage, subscription and invoice metadata; identity/discovery tools cover `/v1/user` and `/v1/organizations`.
- Members: v1 member list/add/remove; current v2 invitation list/create/delete. Pending invitations map `accepted` to false because the v2 list contains pending invitations only. The official SDK and OpenAPI disagree about the legacy member-add route; the implementation follows the current documented POST collection route with `username`.
- Platform API tokens: v1 list/create/revoke plus `/v1/auth/validate`. Optional organization/group/scopes create restricted tokens. Credential values appear only in the explicit token-creation results.
- Audit logs: v1 `page` and `page_size`, independently sent. Defaults remain with the provider (documented page size 100); returned pagination is mapped without synthetic totals. Audit logs require Scaler or higher.
- Closest region: public `GET https://region.turso.io/`, without sending the Platform credential. This describes the request origin, not the end user's machine.

## Lifecycle and schema compatibility

All 21 original tool keys and supported inputs remain. Two additions provide user and organization discovery. Replica placement, Multi-DB Schemas and ATTACH were discontinued for new users; eligible existing paid users remain supported. The official SDK retains dump seeds and replica methods, so these inputs/routes are preserved rather than retired based on incomplete OpenAPI coverage.

Current creation responses provide only `Name`, `DbId`, `Hostname`. Other database responses and group responses can omit legacy fields such as regions, server version, archive/sleep/schema/ATTACH status. Existing output field names and types remain, but omitted provider fields are optional. No false state or region list is manufactured. Optional invoice dates/PDF URLs account for unpaid/upcoming invoice responses. Subscription objects map their name/plan into the existing subscription string.

The database HTTP API (`/v2/pipeline`, `/v1/upload`, `/dump`) uses database-host URLs and SQL tokens; these operations are outside this control-plane integration's 23-tool scope. Invoice tools return metadata/permalinks, not a generated/downloaded file. There are no triggers.

Resource responses must identify the requested database, group, member or token before completion is reported. Malformed Unicode identifiers fail validation before a request. Error messages redact the connection token and supplied dump URL; HTTP status and a valid numeric or HTTP-date Retry-After remain available without retaining raw requests, response bodies or arbitrary headers.

## Official references

- https://docs.turso.tech/api-reference/introduction
- https://docs.turso.tech/api-reference/authentication
- https://docs.turso.tech/api-reference/user/get-current
- https://docs.turso.tech/api-reference/organizations/list
- https://docs.turso.tech/api-reference/locations/closest-region
- https://docs.turso.tech/api-reference/databases/upload
- https://docs.turso.tech/sdk/http/reference
- https://turso.tech/blog/upcoming-changes-to-the-turso-platform-and-roadmap
- https://github.com/tursodatabase/turso-docs/blob/46be9b6e36a2246277639182e977f0a215490886/api-reference/openapi.json
- https://github.com/tursodatabase/turso-api-client-ts/tree/38a8b4ebbc3825fca0e6e525ba7648192eb73c0d/src
