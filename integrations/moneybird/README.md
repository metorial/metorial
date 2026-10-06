# Moneybird

Manage accounting records in authorized Moneybird administrations. Connect with OAuth or a personal bearer token, call `list_administrations`, and pass the chosen `administrationId` to subsequent tools. An optional saved default remains available for existing connections.

The integration provides 21 public tools: administration discovery; contact search, lookup, creation and updates; sales invoice listing, detail, draft creation, lifecycle actions and PDF/UBL downloads; recurring invoices; estimates; products; ledger accounts; tax rates; projects; time entries; bank transactions and booking reconciliation.

Monetary amounts use exact decimal strings. Line quantities retain provider display text, such as `1 x`, with a separate exact decimal quantity when supplied. Resource IDs are returned as strings. List results expose the provider's next and previous page when its response supplies a continuation; no total is guessed.

`manage_sales_invoice` sends or finalizes invoices, records payments, creates credit drafts, and controls workflow pause/resume. These operations can retain financial and audit history. Reconcile an ambiguous outcome before retrying: writes are never automatically retried. Email, postal and electronic delivery depend on your administration's available channels.

Removal is verified by reading the exact resource afterward. Used recurring invoices and ledger accounts can remain deactivated, and used projects can remain archived. `deleted` means the resource is absent; `retired`, `deactivated` and `archived` distinguish retained records.

The PDF download uses Moneybird's authenticated endpoint, which creates a fresh short-lived storage redirect. UBL downloads provide XML. Refreshing a prepared download validates the same invoice and administration again. No signed storage URL or file bytes are exposed in ordinary tool output.

See [Moneybird's API documentation](https://developer.moneybird.com/) for scopes, supported lifecycle transitions and administration-specific requirements.
