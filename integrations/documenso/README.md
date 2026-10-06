# Documenso

Create and manage document or template envelopes, recipients, PDF form fields, folders and signing requests. Inspect audit history and download envelope PDFs, audit logs or signing certificates.

Connect with a team API token including its `api_` prefix. Tokens grant the API access of their team and may expire; reconnect after rotation or expiry. The optional connection instance is a public HTTPS API URL ending in `/api/v2`, defaulting to `https://app.documenso.com/api/v2`. Existing connections retain their previously stored instance. Changing instances requires reconnection. API access is validated with a read-only envelope request; no user or team identity is inferred from document owners.

The twelve existing tools remain available. `download_envelope_file` adds one consolidated PDF workflow. Use `get_envelope` for exact envelope, recipient, field and PDF item IDs. Lists expose native totals, page metadata and the next page.

Recipient and field changes require a draft. Coordinate names remain `pageNumber`, `pageX` and `pageY`; positions and dimensions are percentages. Recipient creation defaults omitted name to empty and role to SIGNER. Choice fields use `fieldMeta.values`; the legacy `fieldMeta.value` supports TEXT and NUMBER. Template use creates a draft with distribution disabled. Prefilling never signs on another person's behalf.

Distribution and redistribution deliver signing requests; an accepted send does not prove email delivery. Omitted redistribution targets select this envelope's unsigned recipients. No writes or sends are automatically retried. Inspect the envelope and audit history after an ambiguous result.

Original PDF downloads return the provider's stored original; uploads can undergo PDF normalization. Signed PDFs and certificates require a completed document; pending PDFs require a pending document and are not final executed documents. Audit PDFs require a document envelope. Access is checked again when downloading. These authenticated download paths have no documented URL expiry.

Deletion of draft/pending documents and templates can erase their native records and audit entries, emit deletion webhooks, or send cancellation notifications. Previously delivered files and external history remain outside that deletion. Completed deletion is refused according to the API guide. Folder deletion removes child folders and leaves documents unfiled. Inspect contained resources first.

This integration uses the current envelope API. Legacy document/template APIs and the beta base path are scheduled for retirement on March 1, 2027. Team administration, embedding, recipient signing and legacy document migration are outside this tool set.

Official references: [API authentication](https://docs.documenso.com/docs/developers/getting-started/authentication), [current API schema](https://app.documenso.com/api/v2/openapi.json), [envelope migration](https://docs.documenso.com/docs/developers/api/migrate-to-envelopes).
