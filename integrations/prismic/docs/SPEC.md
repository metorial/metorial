# Prismic API contract

| Capability | Tools | Native contract |
| --- | --- | --- |
| Content | query_documents, get_document, get_repository_info | Repository-specific Content API v2; generated read token in query; exact ref, native predicates, page/after alternatives, 1-100 page size and 2048-character request URL cap. |
| Custom models | list/get/create/update/delete_custom_type | `https://customtypes.prismic.io/customtypes`; Write bearer plus repository header; native POST insert/update and exact GET readback after 201/204; complete replacement model. |
| Shared slices | list/create/update/delete_shared_slice, get_shared_slice | Same Types API at `/slices`; complete native model and variations, exact readback, irreversible delete. |
| Media | list_assets, upload_asset, update_asset, delete_asset, download_asset | `https://asset-api.prismic.io/assets`; native `items` envelope, `limit` and cursor; multipart `file` bytes; PATCH tags use existing tag IDs; exact filtered-ID readback; provider file URL delivery. |
| Draft migration | create_migration_document, update_migration_document | `https://migration.prismic.io/documents`; Write bearer plus repository; POST type/lang/title/data; PUT replaces data/tags and omits immutable type/lang/alternate-language fields. |

Legacy tool keys and schema fields remain. Nullable native UIDs are accepted as additive output cases. The three legacy auth methods remain; generated tokens follow current documentation, while email/password retains the historical `https://auth.prismic.io/login` string-session contract with honest availability limits. No suitable documented repository user identity endpoint was found; repository metadata and exact configured credential hashes are prerequisite binding, not human identity.

Uploads use the shared HTTP client and a small pinned public-IPv4 resolver because the shared surface has no safe arbitrary-URL resolver. No auth is sent to the upload source; redirects and private/reserved addresses are refused. The integration's 4 MiB transfer cap is separate from the provider's documented limits. File downloads use exact media IDs and approved native CDN hosts; no speculative expiry or renewal is declared.

The private suite independently binds native resource IDs, complete state and markers to the original credentials/repository/fixtures. Changed, unverified, associated or ambiguously visible resources are preserved for manual reconciliation. Content API refs cannot prove disuse in every editor draft, so private permanent-delete scenarios gate before creation. Controlled model/media create and update scenarios require explicit retained-resource/manual reconciliation acceptance; exact resources remain and are rechecked, not deleted. Migration drafts cannot be automatically erased using a documented native endpoint; tests require explicit retention acceptance and report exact IDs for manual UI cleanup. No triggers are exposed.

Primary references, captured during the audit:

- https://prismic.io/docs/content-api
- https://prismic.io/docs/custom-types-api
- https://prismic.io/docs/asset-api-technical-reference
- https://prismic.io/docs/migration-api-technical-reference
- https://prismic.io/docs/api-authentication
- https://github.com/prismicio/prismic-client/tree/2bac99125feee0bd8435329cc1ec3a4a215745fb
