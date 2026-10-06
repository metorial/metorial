# Moneybird capabilities

OAuth and personal bearer tokens authorize the public Moneybird v2 API. OAuth persists access and refresh tokens and records `expiresAt` only if the token response supplies `expires_in`. Administration discovery lists authorized administrations; it does not impersonate a current-user endpoint or silently select one.

| Tools | Capability |
| --- | --- |
| `list_administrations` | Discover authorized administration IDs, names, currencies and access state. |
| `list_contacts`, `get_contact`, `create_contact`, `update_contact` | Search, exact ID/customer-ID lookup, create, update, archive and verified removal. |
| `list_sales_invoices`, `get_sales_invoice`, `create_sales_invoice` | Filter and page invoices, inspect lines/payments, create drafts. |
| `manage_sales_invoice` | Update, send/finalize, register a payment, create credit draft, pause/resume and verified draft deletion. |
| `download_sales_invoice` | Download PDF or UBL XML with validated invoice identity. |
| `manage_recurring_invoices` | List/get/create/update, including line additions or identified line changes, and verified removal/deactivation. |
| `list_estimates`, `create_estimate`, `manage_estimate` | Filter/page estimates, create, send, change state, bill into a draft invoice and verified removal. |
| `manage_products`, `manage_ledger_accounts`, `list_tax_rates` | Product and ledger account lifecycle; read tax rates. |
| `manage_projects`, `manage_time_entries` | Project and time entry CRUD with verified removal/archive state. |
| `list_financial_mutations`, `link_booking` | Read/filter bank transactions; link invoice/document/ledger/payment bookings, or unlink an exact Payment/LedgerAccountBooking ID. |

Monetary amounts are exact decimal strings. Line quantity `amount` retains provider display text; optional `amountDecimal` retains the separate exact decimal quantity. Project budget is a documented integer. Foreign-currency invoice bookings require the amount in both invoice currency (`price`) and administration currency (`priceBase`). A ledger booking uses only `priceBase`; its legacy `price` input supplies that base-currency amount when `priceBase` is absent. Payment linking uses the existing payment amount and refuses ignored amount/ledger options.

Each administration-scoped tool accepts an optional `administrationId` discovered with `list_administrations`, falling back to a saved default for existing connections. No tool changes account settings or assumes another administration when selection is missing.

Provider failures and incompatible inputs give actionable errors without raw transport context. Financial operations and delivery may leave history or notify recipients. Removal outcomes follow observed provider state rather than relying on HTTP 204 alone. There are no event triggers.
