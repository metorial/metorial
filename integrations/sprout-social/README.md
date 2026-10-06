# Sprout Social

Discover authorized customers and connected profiles, query analytics, messages, Listening and care cases, create draft calendar entries, and upload media for later draft use.

Connect using user-based OAuth or a personal API token. API access requires the appropriate plan, API permissions and accepted provider terms. OAuth persists expiry/refresh state when issued; refresh-token availability depends on the OAuth client configuration. The advertised authorization server supports refresh grants but does not advertise an offline_access scope, so none is requested. Personal API tokens support customer discovery but have no documented current-user identity endpoint.

Call `list_customers`, select its customer ID and pass `customerId` to account-scoped tools. Existing saved customer defaults remain a fallback. Call `get_metadata` to discover profile/group/topic IDs. `get_current_user` reads the real OAuth subject.

Messages and cases return opaque `pageCursor` continuation from native `next_cursor`. Case numeric `page` remains accepted for the first page only; later pages require a cursor. Legacy case `fields` are forwarded, with no current documentation promise of projection. Analytics and Listening messages retain numbered paging; Listening metrics are not paged. Requested metrics remain subject to current network availability and plan permissions.

`create_draft_post` always creates drafts. It does not publish or confirm delivery. Unsupported profiles can be omitted without an API error: inspect `acceptedProfileIds`, `omittedProfileIds` and observed `publishingPostIds`. Scheduled draft timestamps are future UTC values, with seconds rounded down. `get_publishing_post` cannot prove publication from PENDING, which the provider documents as a constant in this read surface.

`upload_media` submits a public HTTP/HTTPS URL using multipart encoding and returns the provider media ID and expiration time. The simple upload is limited to 50 MiB and can time out while the provider downloads the source. Media ordinarily expires after 24 hours unless used by a post; no expiry/deletion observation is promised. No draft/media deletion endpoint is documented. Mutations can leave retained or ambiguous resources requiring calendar/media reconciliation before retrying.

Listening excludes X data and Reddit message-level data. WEB is accepted as an alias for WWW; sentiment names are mapped to the provider's lowercase filter values. Default Listening message fields are guid/created_time; explicit field lists must not be empty. Social network, DM-media and review-network restrictions still apply.
