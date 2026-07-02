# Slates Specification for IFS Cloud / IFS Applications

## Overview

IFS Cloud exposes REST APIs as OData projection services. The customer's wording may be "IFS Applications", but current public technical documentation describes IFS Cloud. This integration uses the current IFS Cloud endpoint model and starts with read-only discovery tools because projection names and entity sets are tenant-specific.

## Authentication

Authentication uses an IFS IAM OAuth 2.0 client credentials flow for service integrations.

- Token endpoint: tenant-specific IAM token URL.
- Token request body: `grant_type=client_credentials`, `client_id`, `client_secret`, and optional `scope`.
- API authorization header: `Authorization: Bearer <access_token>`.
- The client refreshes short-lived client-credentials tokens during tool invocation when the stored `expiresAt` is expired or near expiry.

Basic authentication is intentionally not implemented for this package because IFS documentation describes it as an upgrade convenience, not the recommended integration method.

## Configuration

- `baseUrl`: required tenant base URL. Do not include `/main`, `/int`, or `/b2b`.
- `defaultCompany`: optional default IFS company value for future business tools.
- `defaultSite`: optional default IFS site value for future business tools.
- `apiRelease`: optional tenant release label, such as `26R1`, for operator context.
- `defaultPageSize`: optional default page size for bounded list/query tools. Defaults to 50.

## Endpoint Behavior

The client constructs only the documented IFS paths:

- Projection discovery: `/main/ifsapplications/projection/v1/AllProjections.svc/Projections`
- Projection service root: `/<main|int|b2b>/ifsapplications/projection/v1/<ProjectionName>.svc`
- Projection OpenAPI export: `/int/ifsapplications/projection/v1/<ProjectionName>.svc/$openapi`
- Entity-set query: `/<main|int|b2b>/ifsapplications/projection/v1/<ProjectionName>.svc/<EntitySet>`

Projection names, entity set names, and selected field names must be simple OData identifiers. They cannot contain slashes, URLs, or path traversal. OData filter and order-by expressions are sent only as query parameters.

## Pagination

List/query tools request bounded pages only. `top` is capped at 100 and defaults to `defaultPageSize` or 50. OData next links are normalized into `nextPageToken`; pass that value as `skipToken` on the next call.

## Implemented Tools

### `list_api_projections`

Lists projection metadata from `AllProjections.svc/Projections`, defaulting to the Integration API category. Supports `apiClass`, `category`, `nameContains`, `top`, and `skipToken`.

### `export_projection_openapi`

Exports one projection's OpenAPI JSON as a Slate text attachment. Supports OpenAPI `v3` and `v2`.

### `query_projection_records`

Queries one entity set from a projection. Supports optional `projectionEndpoint` (`main`, `int`, or `b2b`; defaults to `int`), `$select`, `$filter`, `$orderby`, `$top`, `$count`, and skip-token pagination. Returns bounded records and pagination metadata.

## Deferred Scope

Business tools for customers, suppliers, customer orders, purchase orders, invoices, projects, inventory parts, and master-data writes are deferred until tenant OpenAPI exports confirm exact projection/entity names and safe behavior in a non-production tenant.

## Primary References

- IFS Cloud Technical Documentation 26R1: https://docs.ifs.com/techdocs/26r1/
- API Documentation and `$openapi`: https://docs.ifs.com/techdocs/26r1/040_tailoring/300_extensibility/010_get_started/100_api_documentation/
- API Explorer overview: https://docs.ifs.com/techdocs/26r1/040_tailoring/300_extensibility/020_api_explorer/
- IFS OData Provider: https://docs.ifs.com/techdocs/26r1/040_tailoring/300_extensibility/040_ifs_odata/
- External integration authentication: https://docs.ifs.com/techdocs/26r1/030_administration/010_security/040_iam_settings/035_iam_clients/020_authenticate_external_integration/
