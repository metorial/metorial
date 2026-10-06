# FreshBooks

Discover your authorized accounts/businesses, manage clients and draft invoices, record payments and expenses, and manage estimates, credit notes, taxes, billable items, projects and time entries.

Call `get_identity` first. Select the exact `accountId` or `businessId` on each subsequent tool. Authorized memberships resolve the matching business for accounting selection; stored account/business configuration remains a compatibility fallback. Setup does not require opaque IDs.

The existing 20 tools remain available. `get_resource` adds exact readback for payments, expenses, estimates, projects, time entries, taxes and items. `list_resources` adds estimates, credit notes and expense categories. Lists return provider totals/pages without substituting defaults and accept 1–100 results per page.

Monetary inputs preserve decimal strings. Currency must be explicit or proven from the existing resource/client/invoice; no USD fallback is used. Payment amounts use the selected invoice's currency; moving an existing payment to another currency requires a new amount. Numeric outputs reject decimal values that would lose precision. Updates preserve explicit false, zero and empty clearing values. Replacing invoice/estimate/credit lines replaces the full line collection.

Invoice `send` emails recipients; `markAsSent` activates accounting recognition without email. Do these only when intended. Estimate `send` retains its original contract but is unavailable until the provider's current email request is verified; send estimates in FreshBooks.

`delete` on accounting resources sets inactive/deleted visibility and retains history. Project/time/tax removal follows their documented delete APIs. A removal acknowledgment without resource data exposes the previously read resource and `readbackRequired`, and does not claim independent cleanup verification. Read back exact state before retrying an uncertain write.

FreshBooks refresh tokens rotate and are single-use. New connections save the original redirect URI; legacy connections missing it must reconnect. No webhook/trigger functionality or financial-report/export breadth is advertised.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
