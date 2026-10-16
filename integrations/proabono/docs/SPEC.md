# ProAbono integration specification

This package exposes the customer-facing ProAbono Live API under `/v1`. It uses HTTP Basic authentication with the Agent Key as username and API Key as password. The configured HTTPS API endpoint is specific to the account; credentials come from **My Profile > Integration**.

The nine tools and their workflows are listed in [README.md](../README.md). Input schemas are object roots. Existing tool keys, action enums, field types, optionalness, raw quote output, and invoice/portal link outputs are retained.

## HTTP behavior

- Subscription lookup by numeric ID uses `/Subscription/{id}`; lookup by customer uses `/Subscription?ReferenceCustomer=...`. Lifecycle actions address `/Subscription/{id}/Start`, `/Suspension`, `/Upgrade`, `/Termination`, or `/DateTerm`.
- Subscription start, creation, and upgrade controls are query parameters. `atRenewal=false` becomes `Immediate=true`; omitting `atRenewal` preserves the provider's end-of-period default.
- Pricing previews use `/Pricing/Subscription`, `/Pricing/Subscription/{id}/Start`, `/Pricing/Subscription/{id}/Upgrade`, `/Pricing/Usage`, and `/Pricing/BalanceLine`.
- Invoice retrieval uses `/Invoice/{id}`. On-demand billing posts the customer reference in the body to `/Billing/Customer`.
- Offer upgrade discovery uses `Upgrade`, and supports a numeric subscription ID when the customer has multiple subscriptions.
- Balance-line descriptions are sent as `Label`. Provider subtotal, total, localized label, and movement date are mapped without synthesizing absent values.
- Payment settings use `ModeBilling` (`Auto`, `Manual`, `Never`). The legacy `isAutoBilling` field remains a boolean compatibility interface.
- Usage writes require `DateStamp`, which the provider uses for idempotency. `EnsureBillable` is a query parameter.

Provider HTTP failures retain status and uppercase `Target`, `Message`, `Code`, and `Exception` details, including HTTP 422 error arrays. Validation and upstream failures use structured service errors. No broad success-response validator is introduced.

## Scope and limits

Feature discovery supplies references needed by usage workflows. The Live API has no documented authenticated-agent/self endpoint suitable for an identity tool. BackOffice administration and webhooks are outside this package's implemented surface. Invoice and customer outputs provide hosted links rather than initiating downloads; no file-output behavior is changed. Expiring links should be fetched again instead of stored.

The legacy `referenceSubscription` inputs remain accepted in schemas; callers must supply a numeric subscription ID or a customer reference because the official Live API does not document reference-based lookup. Legacy fields not present in a provider response remain absent rather than receiving invented defaults. Live acceptance and download behavior require separate credentialed verification.

## Sources

- [Live API reference](https://doc-api.proabono.com/): Authentication, Errors, Pagination, Customers, Payment Settings, Features, Usages, Offers, Subscriptions, Quoting, Balances, Invoices.
- [BackOffice reference: Billing Modes](https://doc-api.proabono.com/backoffice/#billing-modes): mode names and invoicing behavior.
- [API overview](https://docs.proabono.com/en/developer/api-overview/) and [API keys](https://docs.proabono.com/en/developer/api-overview/how-to-get-my-api-keys/).
