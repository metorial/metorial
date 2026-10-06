# Strapi

Read and manage content entries and existing media through the Content REST API of your Strapi instance. Available models, fields, relations, locales and permissions come from that instance; this integration does not discover admin-only model schemas or manage users, roles, webhooks or GraphQL.

Connect with a Content API token or an existing Users & Permissions end-user login. Set the exact HTTPS instance URL, including any deployment path prefix, and select API version 4 or 5. HTTP is supported only for localhost development. Legacy connections retain their saved instance configuration. New connections store instance settings alongside their credentials; reconnect rather than directing an existing credential to a different instance.

API tokens do not identify a person. JWT Login supports the native legacy JWT mode or explicitly selected refresh mode. Refresh mode requires refresh tokens in the JSON response. Cookie-only refresh sessions cannot be renewed by this connection. Missing or invalid credentials require reconnecting; API tokens have no refresh endpoint.

| Tools | Behavior |
| --- | --- |
| list_entries, get_entry | Read one bounded page or an exact entry, using the model's plural API ID. Filters, sorting, fields and population remain native and permission-dependent. `populate="*"` covers permitted first-level fields. |
| create_entry, update_entry, delete_entry | Write exact model fields or delete the requested entry. Relations/components require the syntax and schema configured by your instance. |
| get_single_type, update_single_type | Read or update the singleton identified by its singular API ID. PUT may create an absent singleton. |
| list_media, get_media | Read bounded media metadata or the exact numeric file ID. Strapi 5 requires the documented `/api/upload/files/page` route; older instances without it must enable/upgrade the route rather than silently returning the whole library. Strapi 4 uses native start/limit offset queries without an invented total. |
| upload_media, update_media, delete_media | Upload one public HTTPS file up to 32 MiB, change file metadata, or delete the exact media. Source downloads carry no instance credential, reject internal addresses and redirects, and preserve binary bytes. |
| get_current_user | Read the native JWT-authenticated end user. API-token connections cannot provide end-user identity. |
| download_media | Provide an existing file from the connected deployment or an explicitly trusted HTTPS storage origin. Private S3 signed URLs are renewed only by rereading the same unchanged file with the original connection/principal. Other expiry formats are not guessed. |

Strapi 5 uses `documentId` and flat records. Strapi 4 uses numeric entry IDs passed unchanged as strings in the retained `documentId` input and returns native `attributes` records. Numeric media IDs remain exact safe integers. Native outputs are preserved rather than converted into a fictional universal content model.

Strapi 5 REST POST and PUT publish immediately by default when Draft & Publish is enabled. Explicitly pass `status="draft"` for draft-only changes. Version 4 write requests must omit `status`; set its documented `publishedAt` field explicitly instead. Version 4 draft lists use preview plus a null-publication filter; exact draft entry reads use those lists because preview includes both drafts and published entries. Version 4 localized entries use their separate numeric IDs; omit locale on updates/deletes and specify `fields.locale` when creating localized content.

Strapi 5 deletion targets the requested locale, or the instance default locale when omitted, and returns HTTP 204 without a deleted entry. Acceptance does not prove removal from backups, retained history, other locales or external systems. Media deletion can break references. Content and media writes may invoke instance hooks and incur storage effects. On an uncertain write or malformed receipt, inspect the exact resource before retrying; do not automatically repeat creates or uploads.

Pages default to 25 items and are bounded to 100. Response JSON is bounded to 8 MiB and field payloads to 1 MiB. File downloads use existing provider URLs; metadata size is not treated as verified byte length. The instance's configured REST prefix must be `/api`; custom routes and response overrides require their own documented contracts.

Official references: [Strapi 5 REST](https://docs.strapi.io/cms/api/rest), [status](https://docs.strapi.io/cms/api/rest/status), [upload and signed files](https://docs.strapi.io/cms/api/rest/upload), [Users & Permissions REST](https://docs.strapi.io/cms/features/users-permissions/rest-api), [Strapi 4 REST](https://docs-v4.strapi.io/dev-docs/api/rest).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
