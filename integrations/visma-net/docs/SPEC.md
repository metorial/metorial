# Slates Specification for Visma Net

## Overview

Visma Net is Visma's cloud ERP product for finance, logistics, project accounting, reporting, and related business operations. Visma's official OpenAPI assets use the title `Visma.net ERP API`; this integration uses the current product display name, Visma Net.

The implemented API surface is intentionally read-first. It covers high-value lookup and sync workflows for customers, suppliers, general ledger accounts, customer invoices, supplier invoices, projects, inventory items, and sales orders. It also supports Visma attachment/blob downloads through Slate attachments and polling of asynchronous background API operations.

## Authentication

The integration supports Visma Connect OAuth 2.0 authorization code flow for the interactive API.

- Authorization URL: `https://connect.visma.com/connect/authorize`
- Token URL: `https://connect.visma.com/connect/token`
- API base URL: `https://api.finance.visma.net`
- Supported initial scopes:
  - `vismanet_erp_interactive_api:read`
  - `vismanet_erp_interactive_api:create`
  - `vismanet_erp_interactive_api:update`
  - `vismanet_erp_interactive_api:delete`
  - `vismanet_erp_interactive_api:ui-extension`

Only read-scoped tools are implemented initially. Service API client credentials are not implemented because the public plan identified tenant-aware token acquisition and developer portal access as open questions.

Visma's Swagger UI marks the APIs as tenant-enabled and appends `tenant_id` to token requests. This integration requires `tenantId` configuration before OAuth starts, sends it during authorization-code exchange and token refresh, persists it in auth output, and rejects tool calls when stored auth tenant context differs from the current configuration.

## Configuration

- `tenantId` is required and identifies the Visma Net tenant/company context used for the connected account.
- `defaultBranch` is optional and is applied to list tools whose Visma endpoint supports a `branch` query parameter when the tool input does not specify one.
- `defaultPageSize` is optional and is used by list tools that support page-size pagination. The integration caps this value at 500.

## Tools

### Read Resources

- `list_customers` and `get_customer`
- `list_suppliers` and `get_supplier`
- `list_accounts` and `get_account`
- `list_customer_invoices` and `get_customer_invoice`
- `list_supplier_invoices` and `get_supplier_invoice`
- `list_projects` and `get_project`
- `list_inventory_items` and `get_inventory_item`
- `list_sales_orders` and `get_sales_order`

List tools expose endpoint-specific filters from the official OpenAPI document, including pagination where supported, `lastModifiedDateTime`, and `lastModifiedDateTimeCondition` where supported. The tools return normalized summaries with stable identifiers, status, dates, currency/totals where available, ETag or timestamp hints where available, attachment references where available, and bounded line/attachment counts.

The sales order tools use the `Visma.net ERP API` `/v2/salesorder` read endpoints described in the ERP OpenAPI document. Visma's current OpenAPI text marks those endpoints as replaced by the separate SalesOrders v3 API after March 31, 2026; migrating to v3 is deferred because that API uses a separate `https://salesorder.visma.net` surface and client-credentials scope model.

### Files And Background Operations

- `download_attachment_or_blob` downloads either `/v1/attachment/{attachmentId}` or `/v1/blob/download/{blobId}` and returns the bytes through a Slate attachment.
- `get_background_operation` reads `/v1/background/{requestId}` and can optionally attach `/v1/background/{requestId}/content`.

File contents are never returned inline in structured output fields.

## Deferred Work

Write tools such as customer/supplier upserts, sales order creation, supplier invoice creation, release/correct/reverse/void actions, and attachment upload are deferred until a live tenant confirms exact payload schemas, ETag behavior, module availability, and accounting/audit semantics. Live E2E requires a Visma Developer app, tenant ID, demo company, default branch, and stable fixture records.
