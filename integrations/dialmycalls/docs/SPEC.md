# DialMyCalls API specification

Official API documentation: https://www.dialmycalls.com/api-documentation
Official SDK authentication reference: https://github.com/dialmycalls/javascript-sdk-v2#documentation-for-authorization

## Authentication and responses

Requests target `https://api.dialmycalls.com/2.0`. The official documentation shows HTTP Basic authentication; the provider SDK also documents the `X-Auth-ApiKey` header used by this integration. Successful payloads are in `results`; `meta` identifies success or failure. HTTP and API failures are reported with their provider message and status.

List endpoints accept a `Range` header such as `records=1-100`, with at most 100 records per request. Tool `range` inputs are forwarded to this header after validation. A list tool returns one page, not every page.

## Supported tools

- Contacts: `list_contacts`, `get_contact`, `manage_contact`.
- Groups: `list_groups`, `manage_group`.
- Voice broadcasts: `create_voice_broadcast`, `list_voice_broadcasts`, `cancel_voice_broadcast`.
- Text broadcasts: `create_text_broadcast`, `list_text_broadcasts`, `cancel_text_broadcast`.
- Recordings: `manage_recording`, `list_recordings`.
- Caller IDs: `manage_caller_id`, `list_caller_ids`.
- Incoming texts: `list_incoming_texts`, `delete_incoming_text`.
- Sender discovery: `list_keywords`, `list_shortcodes`.
- Account resources: `list_vanity_numbers`, `list_do_not_contacts`, `manage_access_account`, `list_access_accounts`, `get_account`.

## Contract details

Contact group membership is an API array of objects containing `id`. The existing `groups` string remains available: existing string values are retained, and API arrays are represented as JSON text. The additive `groupIds` array exposes the identifiers directly. Updating a contact without `phone` first retrieves and preserves the current number because the API documents it as required.

Incoming text `message` values retain the provider's URL-encoded representation. Recording `fileUrl` values remain unchanged. Creating or renaming a ready recording, or retrieving one recording by ID, also supplies the recording file for download. Pending recordings are not offered for download until ready. The public docs do not specify recording URL expiry or extra download authentication requirements.

Voice broadcasts require caller and recording IDs; an alternate machine recording requires answering machine detection. Text broadcasts require a keyword ID and up to ten messages. Existing optional inputs and numeric output types remain unchanged.

## Verification boundary

The refresh uses documentation audit, compilation, formatting, and schema compatibility checks. Live provider operations, file download behavior, E2E suites, and tool-use evals were not exercised.
