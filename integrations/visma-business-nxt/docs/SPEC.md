# Slates Specification for Visma Business NXT

## Overview

Visma Business NXT is a cloud ERP from Visma Software Nordic. Its public API is GraphQL and is served from the user-context endpoint `https://business.visma.net/api/graphql`. This integration implements an initial read-only surface for tenant discovery and common ERP lookup workflows.

## Authentication

Authentication uses Visma Connect OAuth 2.0 authorization code flow for web applications.

- Authorization endpoint: `https://connect.visma.com/connect/authorize`
- Token endpoint: `https://connect.visma.com/connect/token`
- Userinfo endpoint: `https://connect.visma.com/connect/userinfo`
- Business NXT read-only scope: `business-graphql-api:access-group-based-readonly`
- Business NXT read/write scope: `business-graphql-api:access-group-based`
- Identity scopes requested by the integration: `openid`, `email`, `profile`, `offline_access`

The Developer Portal application must add the Business NXT GraphQL API integration and wait for Visma approval before API calls succeed. Company access is controlled by the authenticated user's Visma.net rights.

## Configuration

- `selectedCustomerNo`: optional default Visma.net customer ID used by company discovery.
- `selectedCompanyNo`: optional default Visma.net company ID used by company-scoped tools.
- `defaultPageSize`: optional default page size for paginated table tools. Defaults to 50 when omitted.

## GraphQL Behavior

The client sends named GraphQL operations with variables and fetches only fields used by tool outputs. GraphQL `errors` are treated as failures even when partial `data` is present. Business NXT trace IDs from `extensions.vbnxt-trace-id` are preserved in service error details when available.

Connection tools normalize `pageInfo.endCursor` into `nextCursor` when `hasNextPage` is true. Cursors are opaque.

## Implemented Tools

### `list_accessible_customers`

Uses `availableCustomers` to return `name` and `vismaNetCustomerId`.

### `list_accessible_companies`

Uses `availableCompanies` to return `name`, `vismaNetCompanyId`, and `vismaNetCustomerId`. Supports optional `customerNo`.

### `search_associates`

Uses `useCompany(no:) { associate(...) }`. Supports filters for `associateNo`, `customerNo`, `supplierNo`, `name`, and customer/supplier kind. Returns `associateNo`, `customerNo`, `supplierNo`, `name`, and provider primary key metadata.

### `get_associate`

Looks up one associate by `associateNo`, `customerNo`, or `supplierNo`.

### `list_chart_of_accounts`

Uses `useCompany(no:) { generalLedgerAccount(...) }`. Supports filters for exact account number, account number range, and name text. Returns `accountNo`, `name`, and provider primary key metadata.

### `list_orders`

Uses `useCompany(no:) { order(...) }` with optional `orderNo` and `customerNo` filters. Returns `orderNo`, `customerNo`, `employeeNo`, and up to 10 order-line summaries with `lineNo` and `amountDomestic`.

## Deferred Scope

The research plan identifies write/report workflows such as order creation, finishing/invoicing orders, invoice PDF attachments, batch/voucher creation, voucher documents, customer-price mutations, product lookup, and webhook setup. Those are not exposed in this initial integration because the exact mutation/report field sets, report document shapes, and safe demo-company behavior must be confirmed in GraphiQL and live E2E fixtures before adding destructive or file-output tools.

## Primary References

- Business NXT API docs: https://docs.vismasoftware.no/businessnxtapi/
- Business NXT GraphQL query docs: https://docs.vismasoftware.no/businessnxtapi/schema/queries/query/
- Available customers: https://docs.vismasoftware.no/businessnxtapi/schema/queries/customers/
- Available companies: https://docs.vismasoftware.no/businessnxtapi/schema/queries/companies/
- Filtering: https://docs.vismasoftware.no/businessnxtapi/features/filtering/
- Sorting: https://docs.vismasoftware.no/businessnxtapi/features/sorting/
- Pagination: https://docs.vismasoftware.no/businessnxtapi/features/pagination/
- Web application API integration: https://docs.vismasoftware.no/businessnxtapi/authentication/web/integrations_web/
- Visma Connect server-side web applications: https://docs.connect.visma.com/docs/server-side-web-applications
