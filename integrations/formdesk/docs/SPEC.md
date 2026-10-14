# Formdesk integration

## Authentication

Supply an API key and account folder name. `GET https://www.formdesk.com/api/rest/v1/{domain}/connect` discovers the host used by subsequent calls. The domain belongs to auth output; no duplicate connection setting is required. The returned host must be a Formdesk hostname. Existing auth output already contains the domain and host.

## Tools and provider mappings

- `list_forms`: GET `/forms`; `list_form_items`: GET `/forms/{formName}/items` returns identifiers, labels, types, and nullable choice options.
- `get_form_filters`: GET `/forms/{formName}/filters`.
- `get_form_results`: GET `/forms/{formName}/results`; date fields map to `created_from/to`, `changed_from/to`, `completed_from/to`, filterName to `view`, visitorId to `id_visitor`. Existing sync values map to `ALL`, `N,C,D,R`, or `P`. Limit and offset slice the returned list locally because server pagination parameters are not documented.
- `get_result_details`, `update_result`, `remove_result`, `mark_result_processed`: use `/formresults/{resultId}` and its `/files` or `/processed` suffixes. Details unwrap the `result` object; metadata and optionally file metadata appear in systemFields. Creation/update responses unwrap `results[0]` and expose `_fd_id`.
- `add_result`: POST `/forms/{formName}/results`; existing string field values are preserved. Structured file-upload objects are not supported by the input contract.
- `export_results`: POST `/forms/{formName}/results/export` with JSON `{ format }`; decode every returned `files[].content` into downloadable files. `creditsUsed` retains its public key but represents the remaining credit balance in the Credits response header.
- `get_result_pdf`: POST `/formresults/{resultId}/pdf`; JSON settings use `papersize`, numeric orientation, `scaletype`, `scaling`, camel-case margins, and `userpassword`. Numeric string settings are validated at runtime and the binary response becomes a downloadable PDF.
- `list_files`: GET `/files` with optional `type`; `get_file`: GET file metadata then deliver authenticated GET `/files/{id}/content` as a downloadable file.
- Visitor CRUD uses `/visitors`; `get_visitor` retrieves `/visitors/{id}` and excludes password fields. Optional list search filters the retrieved visitors locally.
- `get_visitor_results`: GET `/visitors/{id}/formresults`, with optional local filtering by form names.
- `sign_on`: POST `/signon` for account users or `/forms/{formName}/signon` for visitors. Optional email/userId/formName fields enable documented selectors; visitorId maps to `id` and requires formName. Provider returns the sign-on URL.
- `park_data`: POST `/park` with `{ data, expires, reuse, preventchange }`. Expiration defaults to one day and must be a positive whole number. formName builds the returned ticket URL. `preventChange` can require tickets for subsequent form access; restore access by parking with false and opening that ticket URL.

## Compatibility and limits

All existing tool keys, input field types, and enum values are preserved. The legacy `/visitors/authenticate` endpoint and legacy redirectUrl sign-on parameter remain, but neither is described in the current REST collection; provider failures surface as service errors. The legacy export formats dbase/foxpro, PDF Legal paper size, filename file lookup, and PDF margin units need provider confirmation. No suitable current-user identity endpoint is documented.

No live provider, file delivery through the deployed service, trigger, or evaluation verification was performed in this refresh.

## Official sources

- https://formdesk.com/en/features/webservice-api/ (links the REST collection)
- https://documenter.getpostman.com/view/9848031/SWEDyDrC (REST API v1)
- https://documenter.gw.postman.com/api/collections/9848031/SWEDyDrC?segregateAuth=true&versionTag=latest (public collection data)
- https://www.formdesk.com/manual/webservice2/?get=1 (API overview)
