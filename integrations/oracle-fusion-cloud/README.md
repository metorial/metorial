# <img src="http://provider-logos.metorial-cdn.com/oracle-fusion.svg" height="20"> Oracle Fusion Cloud

Read Oracle Fusion Cloud suppliers, purchase-order headers, payables invoices, worker directory records, and inventory items. Create standard payables invoices, edit their descriptions, and delete eligible unvalidated invoices.

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
| Procurement | `list_purchase_orders`, `get_purchase_order` |
| Payables reads | `list_invoices`, `get_invoice`, `list_invoice_lines` |
| Payables writes | `create_invoice`, `update_invoice`, `delete_invoice` |
| Worker directory | `list_workers`, `get_worker` |
| Items | `list_inventory_organizations`, `list_items`, `get_item` |

List tools return one page with `items`, `hasMore`, and `nextOffset`. The default page size is 25 and the maximum is 100. Continue using the returned offset and the same filters. Contains filters accept literal text without wildcard characters; use an exact filter for values containing wildcards.

Use the returned `resourceKey` for detail, child-list, update, and delete tools. An Oracle resource key can differ from its business ID or number; do not construct keys from invoice numbers, person IDs, or item IDs.

## Invoice workflow

Discover a financials business unit, supplier, and supplier site before creating an invoice. Supply a unique invoice number, date, currency, positive amount, and 1–100 positive item lines. The header amount must match the sum of the item-line amounts. Provide valid distribution details when the tenant requires them.

Creation supports standard invoices that are not matched to purchase orders or receipts. `update_invoice` changes only the description; it cannot correct amounts, lines, currency, dates, or suppliers.

Updates and deletion read current invoice state first. Unknown or ineligible states are rejected. Deletion is subject to Oracle's restrictions for validation, matching, calculated tax, and approval state. A failed deletion does not attempt cancellation. See [Oracle's deletion restrictions](https://docs.oracle.com/en/cloud/saas/financials/26c/fappp/why-can-t-i-delete-an-invoice.html).

If a create request times out, search by invoice number, supplier number, and business unit before submitting it again. Oracle background processing can change an invoice's status after creation.

## Purchasing, worker, and item data

Purchase-order tools provide header details, including supplier, business unit, status, and amounts. Worker tools provide person identifiers and display names for the current date or a specified effective date. Item tools provide catalog information and inventory organization details.

For connection settings, API resources, and response formats, see the [integration reference](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
