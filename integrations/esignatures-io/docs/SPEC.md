# eSignatures.io integration

API reference: https://esignatures.com/docs/api

Authentication uses the account secret token as the HTTP Basic username with an empty password. No account or workspace identifier is required at connection setup.

Contract tools create, query, withdraw, send drafts, request asynchronous PDF previews, and manage signers. Placeholder inputs retain `apiKey` and `value`, mapped to the provider's `placeholder_key` and `replace_with_text`. The legacy `no_delivery` value maps to an empty delivery setting; email and SMS are supported.

Template tools create, inspect, list, update, copy, and delete templates and manage collaborators. Copying uses the documented duplicate endpoint, with `targetApiKey` mapped to `target_secret_token`. Markdown is the documented template creation format. Existing document-element inputs remain accepted for compatibility; their current provider support has not been verified.

`get_document_content` reads contract or template Markdown. `update_document_content` applies ordered find/replace edits, optionally in a dry run. An empty search replaces all content and an empty replacement deletes matched content.

`query_contract` provides a downloadable signed PDF when the provider returns a URL. PDF URLs can be renewed on download. `generate_pdf_preview` queues work; its result arrives through the provider webhook, outside this tool response.

Provider errors and invalid responses produce structured service failures. Signer-field IDs are preserved verbatim. Frequent polling and data older than two weeks are subject to provider limits. No live-provider verification is claimed.
