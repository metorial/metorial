# Plaid integration scope

The 25 tools described in the package README use documented POST endpoints on `https://sandbox.plaid.com` or `https://production.plaid.com`, authenticated with `PLAID-CLIENT-ID` and `PLAID-SECRET`. Requests explicitly pin `Plaid-Version: 2020-09-14`. Environment selection remains configuration, preserving existing credential contracts.

The integration supports account/product reads, one-page transaction sync and offset history, institution lookup/search, Link/public-token exchange, Item removal, Signal evaluation, transaction enrichment, Asset Report creation/read/PDF/removal and supported one-time transfer authorization/create/read/list/cancel. Authorization create supports ACH, same-day ACH and RTP. Other provider products and payment rails require workflows outside this integration.

Sensitive Item and report tokens are required capabilities. Public/link/access/report tokens intentionally returned by their creation/exchange tools must be stored privately by callers. They are never included in error details or file metadata. Provider failures expose safe classification and request receipts without retaining transport errors or raw provider messages.

Asset Report PDF retrieval is an authenticated POST, not a public download URL. The report tool validates its PDF response and provides a downloadable file with sanitized metadata. It retains the original JSON report output contract.

No webhook triggers or automatic registrations are provided. Source Item removal does not erase previously generated reports. Transfer and Signal histories are retained by the provider; there is no invented history-deletion endpoint. Cancellation acknowledgments are distinguished from independently read transfer state. Authorization cancellation has no public state lookup endpoint in the current specification.

Sources: [API](https://plaid.com/docs/api/), [Transactions](https://plaid.com/docs/api/products/transactions/), [Transfer](https://plaid.com/docs/api/products/transfer/), [Assets](https://plaid.com/docs/api/products/assets/), [Signal](https://plaid.com/docs/api/products/signal/), [official OpenAPI](https://github.com/plaid/plaid-openapi/blob/master/2020-09-14.yml).
