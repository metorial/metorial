# <img src="http://provider-logos.metorial-cdn.com/oracle-fusion.svg" height="20"> Oracle Fusion Cloud

Read Oracle Fusion Cloud financials, purchasing, worker assignments, inventory, sales orders, and receiving history. Download invoice files and manage eligible payables invoices, purchase requisitions, and original draft purchase orders.

## Connect

Connect with an Oracle IAM confidential OAuth client configured for authorization-code and refresh-token grants. Configure the client to authenticate with a client ID and secret (`client_secret_basic`).

1. Register the application's callback URL in the IAM client and enable authorization-code and refresh-token access.
2. Grant the client the Fusion Applications resource scope shown in your identity domain and the `openid`, `profile`, `email`, and `offline_access` scopes.
3. Supply the client ID and client secret through the connection's OAuth credentials.
4. Enter your Fusion instance origin, IAM identity-domain origin, and exact Fusion resource scope. Use HTTPS origins, such as `https://example.fa.oraclecloud.com`; do not include an API path.
5. Sign in as a user with the required application roles and business-unit data access.

OAuth scopes do not grant Fusion business roles. Access to suppliers, procurement, invoices, workers, and items depends on the user's roles and enabled modules. A user may connect successfully while lacking access to a particular tool.

See [Oracle's OAuth setup guide](https://docs.oracle.com/en/cloud/saas/applications-common/26c/farca/configure_oauth.html) and [IAM identity and refresh-token guidance](https://docs.oracle.com/en-us/iaas/Content/Identity/api-getstarted/usingopenidconnect.htm).

## Tools

| Area | Tools |
| --- | --- |
| Identity | `who_am_i` |
| Suppliers | `list_business_units`, `list_suppliers`, `get_supplier`, `list_supplier_sites` |
| Purchasing reads | `list_purchase_orders`, `get_purchase_order`, `list_purchase_order_lines`, `list_purchase_order_schedules`, `list_purchase_requisitions`, `get_purchase_requisition`, `list_requisition_lines`, `list_draft_purchase_orders`, `get_draft_purchase_order`, `list_draft_purchase_order_lines` |
| Purchasing discovery | `list_procurement_business_units`, `list_procurement_requesters`, `list_buyers`, `list_purchasing_line_types`, `list_purchasing_document_styles`, `list_requisition_preferences`, `list_requisition_charge_accounts` |
| Purchasing draft writes | `create_purchase_requisition`, `update_purchase_requisition`, `update_requisition_line`, `delete_purchase_requisition`, `create_draft_purchase_order`, `update_draft_purchase_order`, `update_draft_po_line`, `delete_draft_purchase_order` |
| Payables reads | `list_invoices`, `get_invoice`, `list_invoice_lines`, `list_invoice_installments`, `list_invoice_line_distributions`, `list_invoice_holds`, `list_invoice_attachments`, `download_invoice_attachment` |
| Payables writes | `create_invoice`, `update_invoice`, `delete_invoice` |
| Receivables | `list_customer_accounts`, `get_customer_account`, `list_customer_sites`, `list_customer_receipts`, `list_receivables_invoices`, `get_receivables_invoice`, `list_receivables_invoice_lines`, `list_receivables_invoice_installments` |
| Workforce | `list_workers`, `get_worker`, `list_worker_work_relationships`, `list_worker_assignments`, `get_worker_assignment`, `list_assignment_managers`, `list_departments`, `list_jobs`, `list_locations` |
| Inventory and fulfillment | `list_inventory_organizations`, `list_items`, `get_item`, `list_on_hand_quantities`, `list_inventory_reservations`, `list_sales_orders`, `get_sales_order`, `list_sales_order_lines`, `list_receiving_transactions` |

List tools return one page with `items`, `hasMore`, and `nextOffset`. The default page size is 25 and the maximum is 100. Continue using the returned offset and the same filters. Contains filters accept literal text without wildcard characters; use an exact filter for values containing wildcards.

Use the returned `resourceKey` for detail, child-list, update, and delete tools. An Oracle resource key can differ from its business ID or number; do not construct keys from invoice numbers, person IDs, or item IDs.

Keep the parent keys returned during discovery. Invoice distributions require both invoice and invoice-line keys; purchase-order schedules require order and line keys; assignments and managers require worker, work-relationship, and assignment keys. Use the same effective date throughout worker navigation.

## Invoice workflow

Discover a financials business unit, supplier, and supplier site before creating an invoice. Supply a unique invoice number, date, currency, positive amount, and 1–100 positive item lines. The header amount must match the sum of the item-line amounts. Provide valid distribution details when the tenant requires them.

Creation supports standard invoices that are not matched to purchase orders or receipts. `update_invoice` changes only the description; it cannot correct amounts, lines, currency, dates, or suppliers.

Updates and deletion read current invoice state first and require a change indicator for a conditional mutation. Unknown or ineligible states are rejected. Deletion is subject to Oracle's restrictions for validation, matching, calculated tax, and approval state. A failed deletion does not attempt cancellation. See [Oracle's deletion restrictions](https://docs.oracle.com/en/cloud/saas/financials/26c/fappp/why-can-t-i-delete-an-invoice.html).

If a create request times out, search by invoice number, supplier number, and business unit before submitting it again. Oracle background processing can change an invoice's status after creation.

## Purchasing drafts

Discover purchasing business units, requesters, buyers, line types, document styles, requisition preferences, and charge accounts before creating a draft. Supplier and site discovery establishes the supplier reference; item discovery supplies the catalog item and its actual unit-of-measure name. Financial business units and workforce locations alone do not establish purchasing eligibility.

Create tools support standard catalog goods with EXPENSE destination and explicit quantities, prices, currency, delivery details, and accounting distribution. Select a non-credit goods line type. Requisitions contain one distribution per line; draft purchase orders contain one schedule and distribution per line. Creation leaves the document incomplete.

Updates are limited to header descriptions (and requisition justification) and line descriptions. They cannot change quantities, prices, suppliers, currency, or delivery details. Update and delete tools read current state, require conditional change indicators, and reject unknown, changed, submitted, approved, canceled, or change-order documents. These tools do not submit drafts or request approval.

After an uncertain create response, search for the draft using its identifying business fields before sending another create request. Do not automatically retry draft creation.

## Financial, worker, and stock data

Payables child tools expose installments, distributions, holds, and file metadata. List invoice files before selecting a file to download.

Customer accounts and sites describe receivables activity and billing context, rather than customer-master administration. Accounted or ledger amounts remain separate from transaction amounts; compare amounts only when their currency basis matches.

Worker tools provide work relationships, assignments, managers, departments, jobs, and work locations for the current date or a specified effective date. Rediscover keys when changing that date; assignment keys identify effective-dated rows. The tools exclude compensation, bank details, national identifiers, and home contact data.

On-hand quantities describe physical stock by organization, location, and unit of measure. They do not represent available-to-promise stock. Reservations are returned separately. Sales-order tools expose headers and lines; receiving tools read completed transaction history.

For connection settings, API resources, and response formats, see the [integration reference](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
