# Wave

Work with Wave Financial businesses, customers, invoices, accounts, products, sales taxes and vendors. Start with `list_businesses` to discover a permitted business ID. This package exposes 31 tools and no event subscriptions.

| Capability | Tools |
| --- | --- |
| Identity and discovery | `get_user`, `list_businesses`, `get_resource` |
| Customers | `list_customers`, `create_customer`, `update_customer`, `delete_customer` |
| Invoices | `list_invoices`, `create_invoice`, `update_invoice`, `delete_invoice`, `approve_invoice`, `clone_invoice`, `send_invoice`, `mark_invoice_sent`, `record_invoice_payment`, `get_invoice_pdf` |
| Accounts | `list_accounts`, `create_account`, `update_account`, `archive_account` |
| Products | `list_products`, `create_product`, `update_product`, `archive_product` |
| Sales taxes | `list_sales_taxes`, `create_sales_tax`, `update_sales_tax`, `archive_sales_tax` |
| Vendors and accounting | `list_vendors`, `create_transaction` |

Connect with OAuth or a developer access token for your own businesses. OAuth refresh preserves the original callback URI and refresh token when Wave does not rotate it. Older connections missing the callback URI need reconnection before refresh. API eligibility depends on permissions and an active Pro or Wave Advisor subscription; write scopes do not grant read scopes, and invoice email needs `invoice:send`. Owner tokens are replaced when expired or revoked.

Pages are 1-based with a maximum size of 100. `list_invoices` can filter by customer, status, invoice date range and invoice number and choose a sort order; `list_customers` can filter by email; `list_accounts` can filter by account types and subtypes. Invoice money values include the display `value` (which can contain grouping separators such as `2,000.00`) and the exact `minorUnitValue`. Legacy numeric fields remain numbers; a Decimal that cannot round-trip safely fails clearly. `get_resource` returns exact decimal strings. Missing optional provider values are omitted, while missing identities, state, amounts or pagination totals cause an error rather than a fabricated value. For example, a legacy sales tax `rate: 5` represents 5%, and is sent to Wave as `0.05`; `get_resource` returns the provider fraction. `update_sales_tax` can supply the documented effective-date `rates` schedule in percentage units.

Account updates require a current `sequence`, or `businessId` for revision discovery. Currency/subtype account patches, product write flags (`isSold`/`isBought`) and tax patch flags (`isCompound`/`isRecoverable`) are retained as legacy fields but rejected because those mutations do not support them. Product flags are derived from the associated income/expense accounts. Every supplied invoice item needs a `productId`. Sending requires explicit recipients; marking sent records `MARKED_SENT` by default and does not email. `record_invoice_payment` records a payment received outside Wave against an approved invoice and deposits it to a bank or cash account; it does not charge the customer. When Wave refuses a mutation, its reported field errors are included in the error message. PDF downloads accept secure Wave-hosted URLs read from the current invoice and never forward bearer credentials to the file URL.

`create_transaction` records an accounting entry, requires non-classic accounting, a description and explicit tax amounts when taxes are supplied. It does not move funds. Wave's public API does not provide a transaction read, update, delete or reversal for this entry. The external reference is not a promised idempotency key; do not retry an uncertain creation. Archived catalog records and invoice/email history can remain after cleanup.

Estimates, invoice payment edits and receipts, tax rate mutation endpoints beyond the documented patch, and bank transfers are outside this package's scope.

See the [API reference](https://developer.waveapps.com/hc/en-us/articles/360019968212-API-Reference), [OAuth guide](https://developer.waveapps.com/hc/en-us/articles/360019493652-OAuth-Guide), [scope reference](https://developer.waveapps.com/hc/en-us/articles/360032818132-OAuth-Scopes), and [accounting entry guide](https://developer.waveapps.com/hc/en-us/articles/360057230751-Mutation-Create-Money-Transaction).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
