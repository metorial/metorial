# Hunter

Find and verify professional email addresses, enrich people and companies, and discover companies. Manage saved leads and static lead lists, inspect sequence recipients and state, cancel scheduled recipient emails, and start, pause or resume sequences.

Use a Hunter API key from the [dashboard](https://hunter.io/api-keys). Lookup operations can use credits and retain history; finder and verifier requests can automatically save leads unless auto-save is disabled in the account settings. Adding recipients to an active sequence, starting a draft, or resuming a sequence can send emails. Canceling recipient emails preserves their history.

The integration provides 14 tools. Lead details can be retrieved by ID, and account information includes provider-reported allocation and remaining balances. Paginated results distinguish returned page counts from totals supplied by Hunter.

See the [API reference](https://hunter.io/api-documentation/v2) and [capability specification](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

Lead attribute filters use provider substring matching; verification and sending status strings may contain comma-separated values and are encoded as array filters. The API-key connection profile identifies the key owner through Account Stats, separately from team quota/account information. A 222 verification response is a temporary failure with no result; a 202 response remains pending. Draft sequence deletion used by controlled verification is soft deletion and does not erase provider history.
