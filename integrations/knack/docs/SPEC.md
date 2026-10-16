# Knack integration

## Authentication and scope

The REST API is application scoped. Object requests require an Application ID and that application's REST API key. View requests require the Application ID and the literal `knack` API-key header; login-protected views additionally require a user token. Actual API keys are never sent to view routes.

The Application ID is supplied with new credentials. Existing saved Application IDs remain accepted. A missing ID produces an actionable error rather than an invented application selection. The app-specific API key cannot discover all account applications. Browser-only `Knack.getUser()` is not a server-side identity endpoint. Manual user tokens require reconnecting after their documented expiry; no OAuth refresh grant exists in this authentication method.

## Records and discovery

Eight tools cover list/get/create/update/delete, existing application metadata discovery, file/image upload, and record-file download. No additional account administration, schema mutations, or webhook routes are claimed. The provider's account-scoped MCP and browser schema APIs are different authentication/runtime products.

Lists preserve one provider page, numeric provider pagination, record values, and complete raw response data. Knack defaults to page 1 and 25 records per page, with a 1,000 maximum. Sorting uses `sort_field` and `sort_order`. Filters serialize as a `match`/`rules` object; extended rules allow omitted values and date `range`/`type`. Connection filters use the connection field key and parent record ID. Connected child views use the documented scenes route and `<page-slug>_id` query parameter.

Object mutations return a record; view mutations return a record/submit-key envelope. Existing `record` output retains the provider response, with optional direct summaries added. Only explicit provider deletion confirmation is reported as deleted. View creation requires form inputs, updates require an edit form or enabled inline editing, and deletion requires a delete link. Form record rules run for view writes. Only specified update fields change. Space related mutations by at least one second to let calculations finish.

Application metadata retains the pre-existing application route. Its current public REST documentation is incomplete; this integration does not infer unsupported schema-mutation endpoints from the browser APIs. Optional object/scene filters focus summaries, while `raw` preserves complete metadata including field settings, connection definitions, and null values. Required summaries must exist in the response; missing names or collections produce an error instead of fabricated values.

## Files

Uploads use binary multipart data at the documented file/image route, then create or update the record with the returned asset ID. An asset can be associated with only one field. The input is base64; it is not returned in the output.

Record-file download reads `<fieldKey>_raw` via an authorized record request, validates the actual asset ID, filename, and URL, and prepares the public URL for download without forwarding credentials. Current official response examples use HTTPS `api.knack.com` URLs with no expiry or signatures. Unexpected hosts, user information, ports, or signed/query URLs are rejected. No expiry interval, metadata-based renewal, or repeated upload is invented. Responses return asset ID, filename, and provider size/type when available, never copied download URLs or bytes.

## Official references

- [Object authentication](https://docs.knack.com/reference/object-based-requests)
- [View authentication and permissions](https://docs.knack.com/reference/view-based-requests)
- [Record lists](https://docs.knack.com/reference/retrieving-multiple-records), [single records](https://docs.knack.com/reference/retrieving-one-record), [pagination](https://docs.knack.com/reference/pagination), [sorting](https://docs.knack.com/reference/sorting)
- [Filters](https://docs.knack.com/reference/constructing-filters), [field operators](https://docs.knack.com/reference/filters-field-types), [connected records](https://docs.knack.com/reference/filtering-by-a-connected-record)
- [Object creation](https://docs.knack.com/reference/object-based-post), [view creation](https://docs.knack.com/reference/view-based-post), [connected creation](https://docs.knack.com/reference/view-based-post-for-inserting-a-connected-record)
- [Object update](https://docs.knack.com/reference/object-based-put), [view update](https://docs.knack.com/reference/view-based-put), [object deletion](https://docs.knack.com/reference/object-based-delete), [view deletion](https://docs.knack.com/reference/view-based-delete)
- [File/image upload and raw download metadata](https://docs.knack.com/reference/fileimage-uploads)
- [Browser schema access](https://docs.knack.com/reference/schema-access-methods), [user tokens](https://docs.knack.com/reference/user-tokens)
