# <img src="https://cdn.prod.website-files.com/642284f33fc26c8faad516ef/656f389907b7ddd490bb13e2_Business%20NXT-logo-main-inline-black-512h.png" height="20"> Visma Business NXT

Query Visma Business NXT ERP data through the official GraphQL API. This integration starts with read-only tenant discovery and accounting/operations lookup tools: accessible customers, accessible companies, associates, chart of accounts, and orders.

## Authentication

Visma Business NXT uses Visma Connect OAuth 2.0. Register a web application in the Visma Developer Portal, add the Business NXT GraphQL API integration, and request either read-only scope `business-graphql-api:access-group-based-readonly` or read/write scope `business-graphql-api:access-group-based`. The current tool surface is read-only.

Enable Offline Access for the OAuth application so Slates can refresh access tokens with `offline_access`.

## Tools

### List Accessible Customers

List Visma.net customers linked to the authenticated Business NXT user. Use this before company discovery when a user has access to multiple customers.

### List Accessible Companies

List companies available to the authenticated user. Use the returned `vismaNetCompanyId` as `companyNo` for company-scoped tools.

### Search Associates

Search the Business NXT `associate` table for customer and supplier master data by associate number, customer number, supplier number, name text, or associate kind.

### Get Associate

Fetch one associate by `associateNo`, `customerNo`, or `supplierNo`.

### List Chart of Accounts

List `generalLedgerAccount` rows for a company with account number and name filters.

### List Orders

List `order` rows for a company with optional order and customer filters, including a limited order-line summary.

## Notes

Business NXT exposes table data through GraphQL under `useCompany(no:)`. Company-scoped tools require `companyNo` unless `selectedCompanyNo` is configured. The GraphQL API returns opaque cursors; do not decode them. Use `nextCursor` as the next `after` value.

Write/report workflows from the research plan, including order creation, order invoicing PDFs, vouchers, voucher documents, and webhooks, were intentionally left out of this initial package because their exact tenant schema and operational setup should be confirmed in GraphiQL and a demo company before exposing destructive tools.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
