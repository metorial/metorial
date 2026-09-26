# Oracle Fusion Cloud integration

Connect to Oracle Fusion Cloud to find suppliers, inspect purchase orders, manage eligible payables invoices, look up workers, and browse inventory organizations and items.

## Connection settings

Authenticate through Oracle IAM with an authorization-code OAuth client that uses `client_secret_basic`. Refresh tokens renew access to the connected account.

| Setting | Value |
| --- | --- |
| `instanceUrl` | HTTPS origin of your Oracle Fusion Cloud instance |
| `identityDomainUrl` | HTTPS origin of your Oracle IAM identity domain |
| `resourceScope` | Exact Fusion Applications resource scope configured for your tenant |

Supply the client ID and client secret through the connection's OAuth credentials. The connection requests `openid`, `profile`, `email`, and `offline_access` alongside your Fusion resource scope. Oracle application roles and data access determine which records and operations are available.

Use `who_am_i` to identify the connected account.

## API resources

Application requests use Oracle REST resource version `11.13.18.05`.

| Tools | API family | Resource |
| --- | --- | --- |
| `list_business_units` | fscmRestApi | finBusinessUnitsLOV |
| `list_suppliers`, `get_supplier` | fscmRestApi | suppliers |
| `list_supplier_sites` | fscmRestApi | suppliers/{key}/child/sites |
| `list_purchase_orders`, `get_purchase_order` | fscmRestApi | purchaseOrders |
| `list_invoices`, `get_invoice`, `create_invoice`, `update_invoice`, `delete_invoice` | fscmRestApi | invoices |
| `list_invoice_lines` | fscmRestApi | invoices/{key}/child/invoiceLines |
| `list_workers`, `get_worker` | hcmRestApi | workers |
| `list_inventory_organizations` | fscmRestApi | inventoryOrganizations |
| `list_items`, `get_item` | fscmRestApi | itemsV2 |
| `who_am_i` | IAM | /oauth2/v1/userinfo |

## Lists and record identifiers

List tools accept resource-specific filters, a `limit` of 1–100 records, and a nonnegative `offset`. The default limit is 25 and the default offset is 0.

Responses include `items`, `count`, `limit`, `offset`, and `hasMore`. When more records are available, pass the returned `nextOffset` with the same filters to retrieve the next page.

Use a record's `resourceKey` for detail, child-list, update, and delete operations. Resource keys are separate from business identifiers such as invoice numbers, supplier numbers, and person IDs. Discovery tools return the identifiers needed for subsequent operations.

## Suppliers and purchase orders

Find suppliers and their sites, then use the returned keys to retrieve supplier details or list sites. Business-unit discovery provides names and identifiers for financials workflows. Purchase-order tools return header information, including supplier, business unit, status, and amounts.

## Payables invoices

Create standard invoices with 1–100 positive item lines that are not matched to purchase orders or receipts. The sum of the line amounts must equal the invoice amount. Supply accounting dates and distribution combinations when required by your tenant.

Read invoice headers and lines with `get_invoice` and `list_invoice_lines`. Use `update_invoice` to change the description of an eligible unvalidated invoice.

Updates and deletions check the current invoice and line states before making changes. Unknown or ineligible states are rejected. Oracle also enforces restrictions for matching, tax calculation, approval, accounting, and payment status. A failed deletion does not cancel the invoice.

If an invoice changes during an operation, retrieve its current state before trying again. After an uncertain create response, search by invoice number, supplier number, and business unit before submitting another request.

## Workers and inventory

Worker tools return person identifiers and display names. Provide an `effectiveDate` in `YYYY-MM-DD` format to view records for a specific date; omit it to use the current date.

Discover inventory organizations and use their identifiers or codes to find items. Item details include the item number, description, status, and primary unit of measure.

## Official references
- [OAuth](https://docs.oracle.com/en/cloud/saas/applications-common/26c/farca/configure_oauth.html)
- [IAM OpenID](https://docs.oracle.com/en-us/iaas/Content/Identity/api-getstarted/usingopenidconnect.htm)
- [Payables invoices](https://docs.oracle.com/en/cloud/saas/financials/26c/farfa/api-invoices.html)
- [Invoice deletion](https://docs.oracle.com/en/cloud/saas/financials/26c/fappp/why-can-t-i-delete-an-invoice.html)
- [Supplier resources](https://docs.oracle.com/en/cloud/saas/procurement/26c/fapra/api-suppliers.html)
- [Worker projection](https://docs.oracle.com/en/cloud/saas/human-resources/farws/Sort_Workers_by_Display_Name.html)
- [Item resources](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/fasrp/api-product-lifecycle-management-items-version-2.html)
