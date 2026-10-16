# Altoviz integration

Altoviz is an invoicing and accounting service for small businesses. This integration uses the current v1 REST API and API-key authentication through `X-API-KEY`.

## Sources

- [Official API reference](https://developer.altoviz.com/api)
- [Official OpenAPI contract](https://developer.altoviz.com/openapi.yaml), inspected 2026-10-15
- [Developer getting started guide](https://developer.altoviz.com/docs/getting-started)
- [August 2026 API changes](https://developer.altoviz.com/blog/2026-08-17-changelog)
- [September 2026 price changes](https://developer.altoviz.com/blog/2026-09-14-changelog)

## Supported workflows

Customers, contacts, products, suppliers, sales invoices, quotes, credits, and receipts have collection tools and create/update/delete operations. `get_customer` supports provider ID, internal ID, and unambiguous email discovery. `get_record` retrieves full details of the other seven resource types. `get_current_user` returns the connected user's `userId` and profile.

Invoices can be finalized, paid, and emailed. Quotes can be emailed. `download_sale_document` delivers a PDF for an invoice, quote, or credit using the authenticated provider download endpoint. `get_settings` also returns optional VAT, classification, and unit reference data.

## Request compatibility

- Public `Sale` tool names are retained, while documented invoice, quote, and credit endpoints use `SalesInvoices`, `SalesQuotes`, and `SalesCredits`.
- `mark_invoice_as_paid` sends `invoiceId`, `date`, `paymentMethod`, and `finalizeInvoice: true` to `POST /v1/SalesInvoices/MarkAsPaid`. Legacy payment-method aliases `BankTransfer` and `CreditCard` map to `Transfer` and `Card`. Optional partial amounts, references, update flags, and finalization dates are supported; the returned `paid` flag is the provider's actual `isPaid` state.
- Legacy invoice filters map `dateFrom`/`dateTo` to `From`/`To`, sorting to `OrderBy`, and `includeCanceled` to the current `Cancelled` tri-state filter. Explicit `cancelled` takes precedence.
- Customer email lookup uses `/Customers/Find?email=...`; exact product-number lookup uses `/Products/Find?number=...`. These find operations do not support pagination.
- Product `salePrice` maps to `taxExcludedPrice`. Explicit `taxExcludedPrice` takes precedence. `taxIncludedPrice`, VAT ID, and unit code are also available.
- Document line `unitPrice` maps to `taxExcludedPrice`, `vatId` to `vat.id`, string `unit` to `unit.code`, and numeric `discount` to a discount object with `type: Percent` unless `discountType: Fixed` is selected.
- Supplier `companyName` maps to the provider's `name`. Receipt `description` maps to `notes`. Receipts are customer payments: the retained legacy `supplierId` field raises a clear validation error because the provider has no supplier link on receipts. Use the additive customer fields instead.

## Response contracts

All pre-existing tool keys and input/output field types, nullability, requiredness, and enum members are preserved. Full provider objects are exposed additively as `raw`, retaining metadata, nulls, nested fields, lines, pricing, and lifecycle state. Numeric identifiers are validated rather than fabricated. A null optional unit ID is omitted from the numeric summary and retained in its raw record. VAT IDs and rates keep their existing required numeric contract and fail clearly if malformed or null.

`get_settings.settings` remains the complete settings object. Provider HTTP errors retain status, body messages, validation details, and available upstream error codes through structured service errors.

## Boundaries and limitations

The existing `update_sale_quote` tool keeps `PUT /v1/SaleQuotes/{id}`. Neither the current `SalesQuotes` nor legacy `SaleQuotes` OpenAPI paths documents PUT, so runtime support remains unverified. Contact metadata is retained as an existing input although the current Contact model does not document it.

No purchase-invoice upload, bank-account management, accounting exports, statistics, product-image tools, or webhook triggers are registered. These provider capabilities require separate focused work. The provider documents no purchase-invoice collection endpoint, so this integration does not claim one.

The integration is a single product and has no sub-product tool categories. No live provider calls, E2E, or tool-use evals were run in this refresh.
