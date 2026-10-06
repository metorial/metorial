# Imgix

Discover and manage sources, browse existing assets, edit metadata, queue origin indexing, request refresh or cache purge, and read analytics reports. Build and sign rendering URLs, download an existing rendered asset, or download the parts of a completed report.

Connect with a Bearer Management API key. Configure Sources, Asset Manager Browse/Edit, Purge, and Analytics permissions for the operations you need. Call `list_sources` to discover source IDs; no account identity is inferred from a key.

Source pages start at zero; asset lists use opaque cursors. Indexing returns a queued receipt and requires a later read to confirm availability. Source deployment can remain pending. Deployment changes require a complete replacement configuration, including write-only storage credentials: the API replaces objects rather than merging them. Name and enabled changes remain direct updates. Secrets are omitted from source results.

Azure deployment creation/replacement currently requires the imgix dashboard because the SAS credential cannot be safely protected in request diagnostics. Azure source reads and direct name/enabled changes remain available. The other five storage variants support deployment mutations. Unexpected reflected secrets refuse a receipt; a mutation may already have succeeded, so inspect the existing resource before repeating it.

Disabling a source retains configuration and history, and cached assets can remain available. Refresh and purge do not erase origin files or refund charges. File delivery uses an assigned source domain and existing asset; rendering and downloads can consume credits. Explicit signed expiries can be renewed using current source settings. Analytics reports are retained for 90 days.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
