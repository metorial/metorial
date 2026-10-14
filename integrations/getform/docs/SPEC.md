# Getform Integration Specification

Getform is now Forminit, a headless form backend. This integration exposes the documented submission and retrieval APIs.

## Authentication

The default `apiVersion: v2` connects to `https://api.forminit.com/v1` with the API key in `X-API-Key`. Create a key in Account → API Tokens in the Forminit dashboard. Protected submissions also require this key.

`apiVersion: v1` preserves the legacy `https://api.getform.io/v1` retrieval endpoint with its form-specific `token` query parameter. Legacy tokens are not sent as Forminit API keys. Current legacy documentation was unavailable during this refresh, so legacy provider behavior remains unverified.

## Tools

- `submit_form`: POST structured JSON blocks to `https://forminit.com/f/{formId}`. Sender and tracking blocks use properties; field blocks use names and values. Use the optional `values` array for multi-choice select or checkbox blocks, omitting `value`. Supports up to 100 field blocks, 50 of each field type, and one of each object block. File uploads require multipart requests and are not exposed.
- `get_submissions`: GET `/forms/{formId}` with page, size, query, files, and timezone options. Returns pagination, field data, workflow state, and optional file metadata. The authoritative `id` is a string; `submissionId` is present only for numeric legacy IDs. `active` preserves the API's boolean active flag and `status` remains a string.

Failures and malformed responses are reported as service errors. No undocumented account, form-management, or identity endpoints are exposed.

## Sources

- [Submit Form API](https://forminit.com/docs/submit-form-api/)
- [List Submissions API](https://forminit.com/docs/list-submissions-api/)
- [Form Blocks](https://forminit.com/docs/form-blocks/)
- [API overview](https://forminit.com/docs/)
