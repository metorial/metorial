# Paystack

Manage Paystack transactions, customers, recurring billing plans and subscriptions, transfer recipients, refunds, settlements, payment pages, payment requests, subaccounts, dedicated virtual accounts and disputes. Read balances, verify transfers, resolve bank accounts and inspect card BIN metadata. The integration provides 41 tools and uses a backend test or live secret key.

Amounts use currency subunits. Charging an authorization, creating or enabling a subscription, initiating a transfer, refunding a transaction or resolving a dispute can affect funds. A successful API acknowledgement does not establish final settlement. A plan update affects existing subscriptions by default; set `updateExistingSubscriptions=false` to affect only future subscriptions. Payment requests default to sending notifications unless an unsent draft or explicit notification option is supplied.

Resource IDs have exact string companions. Legacy numeric fields are returned only when the ID is safely representable; keep the exact field for durable references. Pagination counts and selected relationship fields are omitted when Paystack does not return them. Existing field names and types remain available, with these explicit output-requiredness changes documented in [the specification](docs/SPEC.md).

Deleting a transfer recipient makes it inactive. Archiving a payment request hides it from ordinary listing and verification. Both tools confirm state by reading the same resource and retain financial history. Test and live modes share the API host; the key selects the mode. Feature availability depends on country and merchant eligibility.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
