# Quaderno integration specification

The integration exposes 44 tools: 43 retained action keys and current account discovery. It uses the [current API reference](https://developers.quaderno.io/api/), version `20241028`, for documented operations. Historical compatibility routes remain separate and require account-specific confirmation.

## Connection

API keys use HTTP Basic authentication with the key as username and an empty password. Quaderno Connect uses Bearer access tokens after the documented Basic-authenticated, form-encoded OAuth exchange. Production and sandbox have distinct connection methods and hosts. New OAuth connections request `read_write`; existing read-only grants remain usable for reads and cannot authorize writes. The [Connect guide](https://developers.quaderno.io/guides/connect/standard-accounts/) documents the default read-only grant, read-write grant, and 25-day access-token lifetime when the token response omits expiry.

The authorization identity supplies the account endpoint and an internal profile identifier. That identifier is not a resource ID. New connections retain the discovered account subdomain and environment; older connections can discover and configure their account name. Refresh and profile verification must preserve the stored account. Account tools require the discovered account name. Configuration cannot switch a connected account or environment.

## Operations and amounts

Tools cover tax calculation and tax-ID validation, contacts, products, invoices, credit notes, expenses, proformas, recurring invoice templates, recorded payments, checkout sessions, asynchronous reports, jurisdiction catalog reads, and transaction records. Current document bodies reference a contact with `{id: ...}` and use priced line items. Inputs representing money use major currency units; response fields ending in `Cents` preserve the provider's integer minor units. No differently named legacy amount is inferred from cents. Decimal strings are checked before numeric serialization, and product prices remain strings.

Finalized invoices accept only documented administrative changes through the update tool. Financial corrections use the provider correction workflow. Recurring creation can generate future invoices; supported frequency values map to the current period and frequency. Recording transactions, credits, or payments changes accounting history without promising a money transfer or reversal. Delivery initiates an email workflow without proving receipt. Checkout creation returns a customer checkout link without completing payment.

Every list invocation returns one bounded cursor page. Continue with `createdBefore` or the previous result's `nextPage`; legacy `page: 1` remains accepted. Continuation URLs must preserve the account, environment, list route, and allowed parameters and contain no authentication secret.

Ready reports provide a downloadable CSV. Report state and actual provider amounts remain provider observations, not independent tax or legal conclusions.

## Historical limitations

The current reference does not document historical jurisdiction POST/DELETE, estimate DELETE, payment DELETE, expense payment POST, or arbitrary contact/line credit creation. Retained keys and historical routes do not establish present support. Catalog jurisdiction IDs cannot establish ownership of legacy registrations. Compatibility requests use the account's default API version, so account-specific route and version behavior requires controlled verification. The integration does not expose tax registration administration or event triggers.

## Verification and cleanup

The private suite requires a dedicated synthetic sandbox account, exact controlled identity/contact/product fixtures, no concurrent fixture writes, and no live payment processors. Metadata, financial/retained records, delivery, checkout, and historical routes have separate explicit gates. Independent reads use the same account and version plane as the operation being verified. Ownership discovery must be complete and bounded; missing or contradictory pagination evidence blocks cleanup.

Temporary contact/product/expense/future recurring cleanup requires exact ownership and independent absence confirmation. Cleanup is registered before creation and reconciles ambiguous creation with bounded discovery. An unresolved creation is reported for manual inspection, never treated as successful cleanup. Invoices, credits, proformas, payments, transaction documents, report jobs, checkout sessions, and delivered messages retain history; the suite tracks evidence without claiming deletion or reversal. Historical jurisdiction mutation cases remain gated because safe registration ownership is not established.

Local mocked transport checks and suite collection do not prove deployed credentials, actual financial operations, email delivery, file contents, or provider cleanup. Those require separately authorized controlled live verification.
