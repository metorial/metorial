# Heap API Specification

Heap provides server-side ingestion for events, user identities, user properties, and account properties, plus asynchronous analytics-user deletion.

## Authentication and regions

Ingestion sends the App ID as `app_id` in JSON; an API Key is only needed for deletion. App ID and API Key are owned by authentication, with the ingestion datacenter selected in connection configuration. Deletion requires the Main Production environment App ID. The integration validates nonempty credentials locally without writing test data.

US ingestion uses `https://heapanalytics.com`; EU ingestion uses `https://c.eu.heap-api.com`. The documented privacy API uses `https://heapanalytics.com` for both regions. A Basic-authenticated `POST /api/public/v0/auth_token` returns `access_token`, which is used as a Bearer token for privacy requests. A fresh token is obtained for each invocation.

## Supported operations

| Tool | Endpoint | Behavior |
| --- | --- | --- |
| `track_event` | `POST /api/track` | One event or up to 1,000 events; each requires exactly one identity or Heap user ID. |
| `identify_user` | `POST /api/v1/identify` | Associate an anonymous Heap user ID with a permanent identity. |
| `manage_user_properties` | `POST /api/add_user_properties` | One user or up to 1,000 users. All casings of the property name `id` are reserved. |
| `manage_account_properties` | `POST /api/add_account_properties` | One account or up to 1,000 accounts; configure the account-ID setting in Heap first. |
| `delete_user` | `POST /api/public/v0/user_deletion` | Submit one user or up to 10,000 users; returns request ID and provider status. |
| `get_deletion_status` | `GET /api/public/v0/deletion_status/:id` | Confirm whether a deletion request has completed. |

Single and bulk inputs cannot be combined. User IDs remain strings in tool inputs and must represent integers between zero and `2^53 - 1`. Deletion serializes them as JSON numbers, matching the provider example. Existing property unions continue to support string, number, and boolean values.

Ingestion responses are acknowledgments, so counts report submitted entities. Deletion is asynchronous: `deleted` is true only for provider status `complete`. Missing or malformed required deletion fields fail clearly rather than inventing success. Upstream HTTP and body-level errors retain provider details and HTTP status, with credentials removed from messages and raw request data excluded from the error chain.

The published server-side API has no account/profile identity endpoint. The client-side `identity` and `userID` APIs require a browser SDK session and cannot identify this API connection. No identity tool is fabricated. Webhook and segment-sync APIs are outside this integration's supported surface.

## Official references

- [Server-side API overview](https://developers.heap.io/reference/server-side-apis-overview)
- [Track](https://developers.heap.io/reference/track-1) and [bulk track](https://developers.heap.io/reference/bulk-track)
- [Identify](https://developers.heap.io/reference/identify-1)
- [User properties](https://developers.heap.io/reference/add-user-properties) and [bulk user properties](https://developers.heap.io/reference/bulk-add-user-properties)
- [Account properties](https://developers.heap.io/reference/add-account-properties) and [bulk account properties](https://developers.heap.io/reference/bulk-add-account-properties)
- [User deletion and status](https://developers.heap.io/reference/user-deletion)
