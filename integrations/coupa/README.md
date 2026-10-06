# Coupa

Query purchase orders, invoices, suppliers, requisitions, expense reports, contracts, approvals, users, accounts and receipts. Read exact records, create supported drafts and reference records, update supported fields, and approve or reject pending approvals.

Connect to the HTTPS root URL of your Coupa instance using OAuth Client Credentials and explicitly configured scopes. Existing deprecated API Key connections remain available where the instance supports them. Tenant permissions, configuration and feature availability determine which operations are accepted. Older connections without a recorded authentication mode must reconnect before tool use. Tokens accept documented long JWTs within an explicit local 1 MiB safety bound; client identifiers and client secrets use a local 4096-byte bound.

Results preserve native identifiers, exact decimal strings and unknown noncredential metadata. Documented supplier credential values are omitted. Search counts describe only the returned page; a full page reports possible continuation without claiming a complete inventory. Financial and administrative mutations can retain history, send notifications or affect downstream systems. Requested native writable fields must match the receipt before success is reported. Equivalent decimal formatting is accepted without rounding. Explicit empty strings are sent to Coupa for native validation. Failed verification does not imply rollback; safe requested and returned IDs remain available for reconciliation before retrying.

See [supported contracts and compatibility](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
