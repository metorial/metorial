# Recruitee

Manage candidates, job offers, talent pools, and their pipeline assignments through the company-scoped ATS API. The integration provides 18 tools for identity, candidate and offer lifecycle, search, notes, tags, profile fields, pipeline transitions, reference data, and downloading existing candidate files.

Connect with a personal ATS API token from **Settings → Apps and plugins → Personal API tokens**. It inherits the token creator’s permissions in the company where it was issued. For new connections, set the company subdomain from your sign-in or careers address, without a URL. Existing connections can retain their optional legacy Company ID. The authenticated owner and exact company are read and checked before each tool action; reconnect if either binding changes.

Candidate search defaults to 60 records and supports offset or page for basic search, or documented JSON filters and page for advanced search. Basic candidate lists accept at most 1000 records per request. Offer lists use page and limit, up to 1000 per page. Deprecated kind, scope, and view-mode filters remain available with provider-specific semantics; prefer current status and ID filters. List responses can omit detail fields, so use Get Job Offer for complete details and pipeline stage IDs.

CV updates use a separate provider endpoint. Offer publication, unpublication, closing, drafting, and archival are separate transitions followed by a status read. Profile fields are created one per request, without an upsert guarantee; successful earlier fields remain if a later request fails. Number and salary profile-field values should use the documented decimal strings to preserve their exact value.

Candidate deletion is logical and can leave restorable records, associated history, and audit data. Offer deletion verifies that the detail endpoint becomes absent; it does not guarantee erasure of associated candidates or history. Note deletion and tag removal confirm their current candidate association state. Private note creation is not documented by the current API; the retained private option fails safely and directs you to the Recruitee interface.

File downloads require an existing CV, uploaded cover-letter file, or exact candidate file ID and permission to read the candidate. Each request reads current provider file information. No file-upload, public careers application, audit-log, webhook, or broader recruiting administration capability is included.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
