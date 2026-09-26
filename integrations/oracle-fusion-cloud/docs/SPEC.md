# Oracle Fusion Cloud integration

Connect to Oracle Fusion Cloud to inspect financials, purchasing, worker assignments, inventory and fulfillment. Manage eligible payables invoices, incomplete purchase requisitions, and original draft purchase orders.

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
| `list_invoice_installments` | fscmRestApi | invoices/{key}/child/invoiceInstallments |
| `list_invoice_line_distributions` | fscmRestApi | invoices/{key}/child/invoiceLines/{lineKey}/child/invoiceDistributions |
| `list_invoice_holds` | fscmRestApi | invoiceHolds, correlated through documented invoice fields |
| `list_invoice_attachments`, `download_invoice_attachment` | fscmRestApi | invoices/{key}/child/attachments and attachments/{attachmentKey}/enclosure/FileContents |
| `list_customer_accounts`, `get_customer_account`, `list_customer_receipts` | fscmRestApi | receivablesCustomerAccountActivities and child/standardReceipts |
| `list_customer_sites` | fscmRestApi | receivablesCustomerAccountSiteActivities |
| `list_receivables_invoices`, `get_receivables_invoice` | fscmRestApi | receivablesInvoices |
| `list_receivables_invoice_lines`, `list_receivables_invoice_installments` | fscmRestApi | receivablesInvoices/{key}/child/receivablesInvoiceLines and child/receivablesInvoiceInstallments |
| `list_purchase_order_lines`, `list_purchase_order_schedules` | fscmRestApi | purchaseOrders/{key}/child/lines and lines/{lineKey}/child/schedules |
| `list_purchase_requisitions`, `get_purchase_requisition`, `create_purchase_requisition`, `update_purchase_requisition`, `delete_purchase_requisition` | fscmRestApi | purchaseRequisitions |
| `list_requisition_lines`, `update_requisition_line` | fscmRestApi | purchaseRequisitions/{key}/child/lines |
| `list_draft_purchase_orders`, `get_draft_purchase_order`, `create_draft_purchase_order`, `update_draft_purchase_order`, `delete_draft_purchase_order` | fscmRestApi | draftPurchaseOrders |
| `list_draft_purchase_order_lines`, `update_draft_po_line` | fscmRestApi | draftPurchaseOrders/{key}/child/lines |
| `list_procurement_business_units`, `list_procurement_requesters` | fscmRestApi | procurementBusinessUnitsLOV and procurementPersonsLOV |
| `list_buyers`, `list_purchasing_line_types`, `list_purchasing_document_styles` | fscmRestApi | buyersLOV, purchasingLineTypesLOV and purchasingDocumentStylesLOV |
| `list_requisition_preferences`, `list_requisition_charge_accounts` | fscmRestApi | requisitionPreferences and {key}/child/favoriteChargeAccounts |
| `list_workers`, `get_worker` | hcmRestApi | workers |
| `list_worker_work_relationships`, `list_worker_assignments`, `get_worker_assignment`, `list_assignment_managers` | hcmRestApi | workers/{key}/child/workRelationships, workRelationships/{relationshipKey}/child/assignments, and assignments/{assignmentKey}/child/managers |
| `list_departments`, `list_jobs`, `list_locations` | hcmRestApi | organizations (department classification), jobs and locations |
| `list_inventory_organizations` | fscmRestApi | inventoryOrganizations |
| `list_items`, `get_item` | fscmRestApi | itemsV2 |
| `list_on_hand_quantities`, `list_inventory_reservations` | fscmRestApi | inventoryOutboundItemQuantitiesSummaries and inventoryReservations |
| `list_sales_orders`, `get_sales_order`, `list_sales_order_lines` | fscmRestApi | salesOrdersForOrderHub and {key}/child/lines |
| `list_receiving_transactions` | fscmRestApi | receivingTransactionsHistory |
| `who_am_i` | IAM | /oauth2/v1/userinfo |

## Lists and record identifiers

List tools accept resource-specific filters, a `limit` of 1–100 records, and a nonnegative `offset`. The default limit is 25 and the default offset is 0.

Responses include `items`, `count`, `limit`, `offset`, and `hasMore`. When more records are available, pass the returned `nextOffset` with the same filters to retrieve the next page.

Lists use documented identifier ordering where Oracle supports it. Purchasing document styles retain Oracle's ordering because their unique `StyleId` is not sortable. Offset pages can change if other users modify the collection between requests.

Use a record's `resourceKey` for detail, child-list, update, and delete operations. Resource keys are separate from business identifiers such as invoice numbers, supplier numbers, and person IDs. Discovery tools return the identifiers needed for subsequent operations.

Nested operations retain all parent keys. Obtain invoice-line keys from `list_invoice_lines`, purchase-order-line keys from `list_purchase_order_lines`, and assignment keys through worker work-relationship and assignment discovery. Never treat a business ID as an opaque path key.

## Suppliers and purchase orders

Find suppliers and their sites, then use the returned keys to retrieve supplier details or list sites. Financials business-unit discovery provides names and identifiers for financials workflows. Purchase-order tools return headers, lines, and schedules.

Purchasing discovery is separate: find an eligible procurement business unit, buyer, requester, line type, document style, requisition preference, and charge account. Preferences provide the requisitioning BU, preparer/requester and delivery organization/location. Favorite charge accounts supply a valid accounting combination. Item discovery supplies the catalog item and its actual unit-of-measure name. Use a business category returned by the item or explicitly selected by the caller. Bill-to and ship-to references must be eligible for purchasing; do not assume a financial BU or HCM location establishes that eligibility.

## Purchasing draft writes

Creation supports standard catalog goods with EXPENSE destination. Supply explicit quantities, unit prices, currency, delivery details, descriptions, and accounting references. Each requisition line has one distribution; each PO line has one schedule and distribution. The initial line, schedule, and distribution quantities agree. PO creation requires a buyer, document style and procurement BU.

Choose a non-credit goods line type. Line-type discovery exposes `creditLine` when Oracle supplies it, and creation rejects a line type marked as credit.

Purchase-order lines and schedules return their currency and pricing UOM separately from the quantity UOM. Requisition `unitPrice` is the supplier-currency price; `buyingCompanyUnitPrice` is the separately returned buying-company price and must not be interpreted using the supplier currency code.

Business IDs are strings in tool inputs and outputs. Creation requires IDs that can be serialized exactly as positive JSON integers; IDs above 9007199254740991 are rejected before sending a request.

Create tools leave the document incomplete. Requisition header updates change description and justification; PO header updates change description. Line updates change only the item description or PO line description, up to 240 characters. Quantity, price, supplier, currency, approval, submission and change-order edits are unavailable.

Mutations read the current header and relevant child state and use a conditional change indicator. Requisitions must be incomplete with no submission or approval date. POs must be original incomplete drafts with known revision/change-order state. Unknown, stale, ineligible and wrong-parent records are rejected. Delete failures never trigger cancellation.

After an uncertain creation result, search for an existing draft using its identifying business fields before retrying. These tools do not automatically repeat writes.

Creation and description updates verify the returned document identity and requested values before reporting success. If that verification fails after a write, follow the error's read-back instructions to establish the current state before another change.

## Payables invoices

Create standard invoices with 1–100 positive item lines that are not matched to purchase orders or receipts. The sum of the line amounts must equal the invoice amount. Supply accounting dates and distribution combinations when required by your tenant.

Read invoice headers and lines with `get_invoice` and `list_invoice_lines`. Use `update_invoice` to change the description of an eligible unvalidated invoice.

Updates and deletions check the current invoice identity and line states and require a change indicator for a conditional mutation. Unknown or ineligible states and missing change indicators are rejected. Oracle also enforces restrictions for matching, tax calculation, approval, accounting, and payment status. A failed deletion does not cancel the invoice.

If an invoice changes during an operation, retrieve its current state before trying again. After an uncertain create response, search by invoice number, supplier number, and business unit before submitting another request.

Read installments, line distributions and holds to inspect payment and accounting context. Hold correlation uses the invoice's documented number, supplier and business unit. List invoice file metadata, then select a document whose type is File for a downloadable result. Oracle can omit the MIME type or file size even for a valid file.

## Receivables

Customer-account and billing-site tools expose receivables activity, rather than customer-master CRUD. Standard receipts are scoped to the activity account. Invoice children expose lines and installments. Transaction currency amounts are kept separate from accounted or ledger amounts; a ledger amount whose currency is not supplied by Oracle must not be combined with transaction-currency totals.

## Workers and inventory

Worker tools return person identifiers, display names, work relationships, assignments and managers. Provide an `effectiveDate` in `YYYY-MM-DD` format and carry that same date throughout the parent/child navigation; omit it to use the current date. Department, job and work-location discovery stays within work-related data. Compensation, bank details, national identifiers and home contacts are excluded.

Rediscover worker and assignment keys when changing the effective date, including when switching back to the current date. Assignment keys identify physical effective-dated rows; a detail request rejects a key whose returned date range excludes the requested date.

Discover inventory organizations and use their identifiers or codes to find items. Item details include the item number, description, status, and primary unit of measure.

Physical on-hand quantities retain their organization, subinventory/location and UOM context. They are not available-to-promise quantities. Reservations remain a separate resource. Sales-order tools expose header and line state, and receiving tools read completed receiving transaction history.

## Official references
- [OAuth](https://docs.oracle.com/en/cloud/saas/applications-common/26c/farca/configure_oauth.html)
- [IAM OpenID](https://docs.oracle.com/en-us/iaas/Content/Identity/api-getstarted/usingopenidconnect.htm)
- [Payables invoices](https://docs.oracle.com/en/cloud/saas/financials/26c/farfa/api-invoices.html)
- [Invoice holds](https://docs.oracle.com/en/cloud/saas/financials/26c/farfa/api-invoice-holds.html)
- [Receivables invoices](https://docs.oracle.com/en/cloud/saas/financials/26c/farfa/api-receivables-invoices.html)
- [Customer account activities](https://docs.oracle.com/en/cloud/saas/financials/25d/farfa/api-receivables-customer-account-activities.html)
- [Purchase requisitions](https://docs.oracle.com/en/cloud/saas/procurement/26c/fapra/api-purchase-requisitions.html)
- [Draft purchase orders](https://docs.oracle.com/en/cloud/saas/procurement/26c/fapra/api-draft-purchase-orders.html)
- [Requisition preferences](https://docs.oracle.com/en/cloud/saas/procurement/26c/fapra/op-requisitionpreferences-get.html)
- [Purchasing document styles](https://docs.oracle.com/en/cloud/saas/procurement/26c/fapra/op-purchasingdocumentstyleslov-get.html)
- [Invoice deletion](https://docs.oracle.com/en/cloud/saas/financials/26c/fappp/why-can-t-i-delete-an-invoice.html)
- [Supplier resources](https://docs.oracle.com/en/cloud/saas/procurement/26c/fapra/api-suppliers.html)
- [Worker projection](https://docs.oracle.com/en/cloud/saas/human-resources/farws/Sort_Workers_by_Display_Name.html)
- [HCM REST endpoints](https://docs.oracle.com/en/cloud/saas/human-resources/farws/rest-endpoints.html)
- [Item resources](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/fasrp/api-product-lifecycle-management-items-version-2.html)
