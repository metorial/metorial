# DocuSeal

Manage templates, signature requests, signer state and PDF downloads with a DocuSeal API key. Select the US or EU cloud API URL that issued the key. Self-hosted servers are outside this integration's configuration. No current-user identity endpoint is exposed.

The 17 tools retain the existing template, submission and submitter workflows, and add submission lifecycle updates and document downloads. Lists return native page metadata; pass the returned `next` ID as `after` for another page. `count` is the page size, not an account-wide total. Get a template to discover its fields and signer roles. Role updates apply by position and preserve trailing roles.

Template creation supports PDF, DOCX and HTML sources. Use one source type per request. Arbitrary field-value names, metadata keys and variable names retain their spelling. Creation and updates read back exact native IDs; a failed confirmation can follow a completed write, so inspect current state before retrying.

Email invitations default to enabled for submission creation. Set `sendEmail=false` globally and for individual signers to suppress them. SMS requests and phone verification require a phone number. `completed=true` irreversibly completes a pending signer; completed or declined signers cannot be updated. These actions can generate documents, notifications and provider events even when an API response is lost.

Archive operations retain documents and history. Submission updates can restore archival state or set/remove expiration; neither reverses completed signatures. Permanent deletion is not exposed. Template shared links follow the provider default unless `sharedLink` is supplied.

Document downloads return available PDFs: previews for pending submissions and completed documents after completion. Retrieval may generate retained previews. Native URL expiry is account-configured and not included in the document metadata, so this integration delivers bounded content instead of assigning a guessed expiry. The combined download limit is 64 MiB; larger files remain accessible directly in DocuSeal. Existing `get_submission` requests with `mergeDocuments=true` also provide the merged PDFs for download.

See [the official API reference](https://www.docuseal.com/docs/api). API permissions, signing behavior, email delivery, regional behavior and live cleanup need verification in your own controlled account.
