# sevDesk Integration Specification

sevDesk provides cloud accounting, invoicing, expense tracking, contacts, orders,
and inventory management. This integration uses the API at
`https://my.sevdesk.de/api/v1`.

## Authentication

Connect using the API token from Settings > User in the sevDesk web application.
The API token is sent in the `Authorization` header. Tokens remain valid while
the owning user exists, unless regenerated.

Connection verification uses the documented bookkeeping-version endpoint. The
public API specification does not expose a current-user endpoint, so the
connection does not infer the token owner from the first user in an account.

## Available workflows

- Create, retrieve, update, delete, and search contacts. Optionally add contact
  addresses and communication details.
- Create draft invoices with line items; retrieve and search invoices; send by
  email; record payments; cancel invoices; and convert orders to invoices.
- Prepare downloadable invoice PDFs without marking an invoice as sent.
- Create credit notes from invoices and search credit notes.
- Create vouchers, retrieve voucher details, search vouchers, and record payments.
- Create orders through the order factory, retrieve order details, and search
  orders. Order creation currently creates an order without positions.
- Create and search inventory parts.
- Create or update accounting contacts, and add communication details to contacts.
- Discover check accounts, valid receipt account/tax combinations, and the
  connected bookkeeping system version.
- Prepare a downloadable ZIP of DATEV CSV accounting data for a date range.

## Bookkeeping versions and payments

Use `get_bookkeeping_system_version` to determine which accounting model applies.
Version 1.0 uses legacy tax types and voucher accounting types. Version 2.0 uses
`taxRuleId` and voucher `accountDatevId`; `get_receipt_guidance` provides eligible
receipt account/tax combinations.

All voucher positions must consistently use net or gross amounts. Provide the
corresponding `sumNet` or `sumGross` on every position.

Payment types follow the provider contract: `FULL_PAYMENT` for full payments,
`N` for partial payments, and the documented difference reasons. Online check
accounts require an existing `checkAccountTransactionId`. Other account types
create a transaction automatically.

Dates supplied as `YYYY-MM-DD` are converted to the provider's timestamp or
ISO date-time format where required. Search result counts describe the returned
page, not the total number of records in the account.

## Files and exports

Invoice PDFs and DATEV CSV ZIPs are provided as downloadable files, with structured
metadata in the tool result. For compatibility, `get_invoice_pdf.base64Content`
also returns the provider's documented base64 PDF content, and
`export_datev.exportContent` retains the provider's JSON export data or download
reference. Unsupported binary responses are not coerced into these fields.

The existing synchronous DATEV workflow uses the provider's documented,
deprecated `/Export/datevCSV` endpoint. The account's accounting year must already
be configured. Its revenue/expense inputs map to the provider's `E`/`X` document
scope codes. The provider also offers an asynchronous export-job workflow, which
is not exposed by this integration.

## Official references

- [API reference and authentication](https://api.sevdesk.de/)
- [OpenAPI schema](https://api.sevdesk.de/openapi.yaml)
- [Invoice status transitions](https://tech.sevdesk.com/api_news/posts/2024_04_04-changing-status-invoices-cretid-notes/)
