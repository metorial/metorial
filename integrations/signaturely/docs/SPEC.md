# Signaturely Integration

Connect with an API key from [account settings](https://app.signaturely.com/settings/api).
Requests use the Signaturely API v1 and the `Api-Key` authorization scheme.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_current_user` | Inspect the connected account identity. |
| `list_templates` | Discover a page of API templates and available signer roles. |
| `create_signature_request` | Create a signature request from an existing template. |
| `list_documents` | Find documents using status, sorting, search, and pagination. |
| `get_document_signers` | Discover signer IDs, roles, order, and available signing state. |
| `download_document` | Get a downloadable PDF for a document. |
| `send_reminders` | Send reminders to selected document signers. |

Use `list_templates` to find template IDs before creating a request. Signer roles
must match the selected template. Use `fields` for text API tags and
`checkboxFields` for boolean API tags. Each API tag can appear in only one of
these dictionaries. Ordered requests require a positive whole-number order for
every signer.

List tools default to page 1 with 25 items. `list_documents` also retains offset
pagination: supply either `offset` or `page`. Offset calls translate to provider
pages and may read the following page to fill the requested result window.
`totalCount` is omitted when the API does not return a total.

Signer status and completion timestamps are returned only when present in the
provider response. A completed document downloads as a signed PDF; otherwise
Signaturely supplies the source PDF. PDF URLs are used when issued; the API
documentation does not specify their expiration period.

## API reference

[Signaturely API documentation](https://docs.signaturely.com/) documents account
identity, template-based creation, document/template lists, document signer
lists, PDF retrieval, and reminder requests. Account API plan and quota limits
apply. OAuth, embedded signing/requesting, triggers, and team administration are
outside this integration's current tool set.
