# SAP S/4HANA Integration Spec

## Scope

This package implements the initial low-risk SAP S/4HANA read surface from the ERP research plan:

- Business partners through `API_BUSINESS_PARTNER`
- Sales orders through `API_SALES_ORDER_SRV`
- Billing documents through `API_BILLING_DOCUMENT_SRV`
- Products/materials through `API_PRODUCT_SRV`
- Purchase orders through `API_PURCHASEORDER_PROCESS_SRV`
- Supplier invoices through `API_SUPPLIERINVOICE_PROCESS_SRV`

The package targets SAP S/4HANA Cloud Public Edition APIs first, while allowing compatible tenant roots for private cloud or on-premise systems when the same OData services and communication scenarios are enabled.

## Configuration

`baseUrl` is required and should be the SAP tenant root, for example `https://mytenant-api.s4hana.cloud.sap`, or the API Hub sandbox root `https://sandbox.api.sap.com/s4hanacloud`.

Optional config:

- `sapClient`: sent as the `sap-client` OData query parameter.
- `defaultCompanyCode`, `defaultSalesOrganization`, `defaultPurchasingOrganization`: reserved defaults for later write workflows.
- `sandboxMode`: marks SAP API Hub sandbox usage.

## Authentication

The integration uses custom auth with one input object and `authMethod` discriminator:

- `basic`: communication user/password.
- `bearer`: pre-issued bearer/access token.
- `apiHubKey`: SAP Business Accelerator Hub `apikey` header.

`getProfile` verifies service availability by reading `API_BUSINESS_PARTNER/$metadata`.

## Tool Contracts

All tool inputs are top-level `z.object` schemas. List tools use a conservative default `top` of 25, maximum 100, and require at least one useful filter unless `allowBroadQuery=true` or a SAP `skipToken` is supplied.

List outputs include:

- Stable normalized records for agent workflows.
- `record` with the raw SAP OData object for tenant-specific fields.
- `page.nextPageToken` preserving SAP server next links when present.

## Deferred Capabilities

The research plan identifies `post_journal_entry`, `create_sales_order`, and `download_document_attachment` as later work. They are not implemented here because posting has accounting/legal impact, sales-order creation requires customer sales-area defaults and live validation, and SAP attachment APIs vary by object/tenant.

Webhooks/events are also deferred because SAP business events usually require SAP Event Mesh or BTP setup rather than a simple provider-hosted webhook.

## Verification

Package-level schema regression coverage uses `describeMcpCompatibleToolSchemas('SAP S/4HANA tool input schemas', provider.actions)`.

Private live E2E coverage is in `tests/integrations/sap-s4hana/tools.e2e.ts` and expects a non-production tenant or SAP API Hub sandbox credentials with readable sample data.
