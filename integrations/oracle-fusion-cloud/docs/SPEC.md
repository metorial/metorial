# Oracle Fusion MVP specification

## Authentication and configuration
One OAuth method: authorization code with `client_secret_basic`, renewable access tokens, and IAM UserInfo identity.
Auth owns `instanceUrl`, `identityDomainUrl`, and `resourceScope`. Configuration is empty. Token renewal preserves tenant settings and the previous refresh token when no replacement is issued.
Identity scopes are openid/profile/email/offline_access; business roles and data security remain enforced by Oracle.
Never use the client-credentials grant as a substitute for Fusion Applications authorization-code access.

## API resources
All application paths use REST version 11.13.18.05.

| Tools | Family | Resource |
| --- | --- | --- |
| list_business_units | fscmRestApi | finBusinessUnitsLOV |
| list_suppliers, get_supplier | fscmRestApi | suppliers |
| list_supplier_sites | fscmRestApi | suppliers/{key}/child/sites |
| list_purchase_orders, get_purchase_order | fscmRestApi | purchaseOrders |
| list_invoices, get_invoice, create_invoice, update_invoice, delete_invoice | fscmRestApi | invoices |
| list_invoice_lines | fscmRestApi | invoices/{key}/child/invoiceLines |
| list_workers, get_worker | hcmRestApi | workers |
| list_inventory_organizations | fscmRestApi | inventoryOrganizations |
| list_items, get_item | fscmRestApi | itemsV2 |
| who_am_i | IAM | /oauth2/v1/userinfo |

## Common contracts
- List input: limit default 25, maximum 100, offset default 0, resource-specific typed filters.
- List output: items, count, limit, offset, hasMore, nextOffset when another page exists.
- Resource keys come from validated same-origin provider self links. Business IDs are separate string fields.
- Request paths are selected internally; tools accept no arbitrary URL, raw query, or request body.
- Application requests require HTTPS and do not follow redirects or automatically retry mutations.
- Structured failures preserve provider validation/permission/not-found details without leaking credentials.

## Workflows
Supplier and organization discovery provides the identifiers/names needed by dependent tools. Purchase-order detail is header-only. Worker projection explicitly requests PersonId, PersonNumber, and DisplayName while retaining resource links. Worker effective dates use actual YYYY-MM-DD calendar dates.

Invoice creation writes Standard non-matched invoices with item lines, requiring positive amounts and consistent totals. The description-only update and eligible deletion read current state before mutation and fail closed if that state is missing or unsuitable. Conditional writes use Oracle change indicators when available; stale-state failures are surfaced rather than retried. Deletion never falls back to cancellation. Oracle remains authoritative for tenant/business constraints.

No approval, validation, accounting, payment, tax-calculation or matching operations are exposed. No amount/line corrections, worker/item mutations, triggers, bulk imports, attachments, CX or EPM tools are included.

## Verification boundary
Live verification must cover all 18 tools, discovery/detail continuity, pagination and filter encoding, effective dates, token renewal, and a suite-owned create/read/line-inspection/update/delete invoice lifecycle. Test data must not enter automatic tax/approval processing. A build or skipped suite is not proof of tenant compatibility. The private test suite and status board record whether sandbox verification has occurred.

## Official references
- [OAuth](https://docs.oracle.com/en/cloud/saas/applications-common/26c/farca/configure_oauth.html)
- [IAM OpenID](https://docs.oracle.com/en-us/iaas/Content/Identity/api-getstarted/usingopenidconnect.htm)
- [Payables invoices](https://docs.oracle.com/en/cloud/saas/financials/26c/farfa/api-invoices.html)
- [Invoice deletion](https://docs.oracle.com/en/cloud/saas/financials/26c/fappp/why-can-t-i-delete-an-invoice.html)
- [Supplier resources](https://docs.oracle.com/en/cloud/saas/procurement/26c/fapra/api-suppliers.html)
- [Worker projection](https://docs.oracle.com/en/cloud/saas/human-resources/farws/Sort_Workers_by_Display_Name.html)
- [Item resources](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/fasrp/api-product-lifecycle-management-items-version-2.html)
