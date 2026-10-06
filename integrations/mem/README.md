# Mem

Manage Mem.ai notes and collections through the current V2 API. The 14 tools preserve the original create, read, list, search, delete and Mem It keys, and add exact-version note updates, partial collection updates, and add/remove/move membership.

Use a raw API key from Mem settings. The connection label identifies the configured key; it does not verify a person or account. Mem documents no suitable identity endpoint. Note IDs and collection IDs come from create/read/list/search results.

List cursors must be reused unchanged with the same filters and ordering. Multiple true task/image/file filters use OR semantics. Note search requires a nonblank query and uses a bounded 100-result snapshot; later pages require the same query, filters and returned snapshot ID. Collection search is bounded and has no cursor.

Read a note before updating: submit its complete desired markdown body and exact current version. Stale versions are refused, and versions are never refreshed automatically to overwrite unseen content. Custom creation UUIDs are create-only, including already existing or trashed records. Inaccessible collection IDs and unmatched collection titles can be ignored by the provider; inspect actual returned membership.

Membership changes preserve note content. Move adds the target then removes the source, so failures can leave a partial change. Inspect the exact note before retrying. Deletion is permanent and confirmed request receipts do not undo provider history, indexing or quota effects. Deleting a collection does not imply deleting its notes.

Mem It returns only an asynchronous request receipt, not a note ID or proof of completed processing. No documented status, cancellation or reversal is exposed. Processing can create, merge or update retained notes and consume plan quotas. Reconcile uncertain outputs in Mem before retrying.

No file download or renewal capability is included in this bounded surface. Note readback exposes native linked audio and attachment identifiers. Live provider acceptance and cleanup were not verified during this refresh.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
