# Close integration specification

The integration provides 20 tools using Close's REST API at `https://api.close.com/api/v1`. It covers CRM records, task lifecycles, activity reads, note and email-template management, email submission, saved searches and identity/configuration discovery. Reporting, exports, call/SMS sending, sequences, bulk actions and administration are outside this tool surface.

## Authentication and errors

API keys use HTTP Basic authentication with the key as username and an empty password. OAuth uses `https://app.close.com/oauth2/authorize/` and form-encoded `https://api.close.com/oauth2/token/`, with `all.full_access` and `offline_access`. Token responses determine expiry; refresh must return a newly rotated refresh token. User and organization identity are saved when supplied and verified during profile reads.

The current-user tool reads `/me/`. It projects user, organization, membership and safe email-account identity metadata. It does not return connected-account credentials. Requests stay on the fixed API host with redirects disabled. Service failures expose safe HTTP status and remediation without echoing upstream bodies or credentials. HTTP 429 exposes a numeric Retry-After delay; mutations are never retried automatically.

Sources: [API keys](https://developer.close.com/api/overview/api-key-authentication), [OAuth](https://developer.close.com/api/overview/oauth-authentication), [current user](https://developer.close.com/api/resources/users/get-me), [rate limits](https://developer.close.com/api/overview/rate-limits).

## Resources and contracts

| Tools | API resources and behavior |
| --- | --- |
| Get Current User | `GET /me/`; selected organization, accessible memberships and sender identity discovery |
| List/Get/Manage/Delete Lead | `GET/POST /lead/`, `GET/PUT/DELETE /lead/{id}/`; nested contacts are creation-only |
| List/Manage Contact | `GET/POST /contact/`, `PUT /contact/{id}/`; require explicit parent lead on creation |
| List/Manage Opportunity | `GET/POST /opportunity/`, `PUT /opportunity/{id}/`; integer confidence and monetary cents |
| Get/Manage/Delete Task | `GET/POST /task/`, `GET/PUT/DELETE /task/{id}/`; assignment, completion, documented `date` mapping |
| List Activities | `GET /activity/` or documented subtype list; user/contact/multiple-type filters require a lead |
| Manage Note | `POST /activity/note/`, `PUT /activity/note/{id}/`; plaintext notes |
| Send Email | `POST /activity/email/`; `draft` saves, `outbox` sends, `sent` logs an already sent message |
| Manage Email Template | `POST /email_template/`, `PUT /email_template/{id}/` |
| List Users/Smart Views | `GET /user/`, `GET /saved_search/`; structured `s_query` and legacy textual query kept separately |
| List Pipelines and Statuses | `GET /pipeline/`, `/status/lead/`, `/status/opportunity/`; no invented lead-status type or incomplete-list success |
| Search Leads | `POST /data/search/`; advanced lead query, per-object fields, counts, sorting and cursors |

All 17 prior tool keys and fields remain registered. Documented nullable or omitted non-null output fields become optional while retaining their existing value type. Nullable fields retain nullability. Response-derived IDs, counts and values are never synthesized. Contact/lead expansion fields remain omitted if Close does not return them; lead child collections are retrieved through their individual list APIs when needed.

Lead names are optional at the provider; a name is recommended. Updates reject empty changes. Existing nested contacts on a lead update fail with guidance to Manage Contact. Custom fields are flattened under `custom.FIELD_ID`; current documentation deprecates field-name syntax, which remains accepted for legacy callers. No default sender or recipient is guessed, and unsupported `sendAs` fails before submission. Subject/body retain their established requiredness.

Lead tasks use text and `date`; `dueDate` is the public input mapped to `date` and represents when the task becomes actionable. Outgoing-call reminders use a contact and support optional text during creation. Task text may include line breaks. Updating text on another task type fails with guidance instead of ignoring it. Creating a reminder does not place a call. The current public OpenAPI specification confirms both creation variants and the template read/delete routes: [Close OpenAPI](https://api.close.com/api/openapi.json).

Sources: [lead create](https://developer.close.com/api/resources/leads/create), [lead update](https://developer.close.com/api/resources/leads/update), [contact update](https://developer.close.com/api/resources/contacts/update), [opportunities](https://developer.close.com/api/resources/opportunities), [tasks](https://developer.close.com/api/resources/tasks), [task update](https://developer.close.com/api/resources/tasks/update), [activities](https://developer.close.com/api/resources/activities/list), [email creation](https://developer.close.com/api/resources/activities/emails/create), [Smart Views](https://developer.close.com/api/resources/smart-views/list), [lead statuses](https://developer.close.com/api/resources/lead-statuses/list).

## Pagination and files

Offset lists expose actual `has_more` and optional totals. A next offset advances by the returned page length. Provider-specific maximum limits and offsets remain enforced by Close. Configuration discovery rejects an incomplete response rather than claiming a complete list.

Advanced search maps `fields` to `_fields: { lead: [...] }`, requests counts and combines the caller's query with a lead object-type condition. It supports current nested sorts and normalizes legacy flat field-name sorts. Cursors expire after 30 seconds. A legacy skip is implemented by walking and discarding cursor pages with non-advancement protection; provider pagination has a 10,000-object limit. List Leads retains its legacy GET `query` for compatibility, although the current generated parameter table does not list it; live verification is required for that legacy filter.

No tool in this surface exports or downloads files. Task/activity projections omit recording, voicemail and message-file URLs. The common response boundary removes credential keys and redacts connected access/refresh tokens from string values; credential-bearing dynamic keys are omitted. Search preserves the remaining caller-selected CRM object shape.

Sources: [pagination](https://developer.close.com/api/overview/pagination), [advanced filtering](https://developer.close.com/api/resources/advanced-filtering), [lead listing](https://developer.close.com/api/resources/leads/list).

## Effects and verification

CRM writes may trigger existing workflows or external integrations. Email delivery cannot be undone after sending. Task reminders change a sales rep's inbox; template changes may affect outreach. Private live verification requires an independently verified dedicated synthetic organization and explicitly authorized, disposable records, with separate template/reminder/sending gates and controlled inbox observation. Existing customer records, workflows, bulk sends, campaigns, merges, real calls and billing configuration are not changed by the suite.

Lead deletion removes active CRM records and cascades to child records. Provider recovery copies and audit history may remain; deletion is not a promise of permanent erasure. See [Close's restoration tools](https://help.close.com/technical-support/close-support-tools) and [30-day Event Log](https://developer.close.com/api/resources/events).

No trigger or replacement webhook group is registered.
