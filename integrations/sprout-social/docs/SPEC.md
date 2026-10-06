# Sprout Social API contract

The integration exposes 12 tools, preserving 10 original keys. It uses the current public V1 API at api.sproutsocial.com and the published OAuth authorization server at identity.sproutsocial.com.

| Tools | API behavior |
| --- | --- |
| list_customers | Authorized customer IDs and names; no customer selection required |
| get_current_user | Real user-based OAuth subject/name/email; personal API tokens are unsupported |
| get_metadata | Profiles, groups, tags, users, teams, topics and case queues |
| get_profile_analytics, get_post_analytics | Owned profile/post reporting with numbered pages and current metric availability |
| get_messages | Owned message filters, optional exact message selection and cursor continuation |
| get_cases | Case-ID or bounded date queries and native cursor continuation; old page/fields limitations remain explicit |
| get_listening_messages, get_listening_metrics | Topic message paging or unpaged aggregation; documented network limitations |
| create_draft_post, get_publishing_post | Draft calendar creation/readback, actual accepted profiles and calendar IDs; no delivery completion claim |
| upload_media | Multipart submission of a public source URL; observed media ID/expiry only |

All account-scoped tools accept a customer ID discovered through list_customers, with a fallback for legacy saved defaults. Resource IDs are encoded; auth, paths and responses use finite timeouts, refused redirects, explicit response validation and safe service failures. A malformed or uncertain write response must be reconciled rather than treated as a successful empty result.

Drafts can fan out across profiles/times; unsupported targets may be silently dropped by the provider. No public draft/media delete route is documented. Uploaded media can remain until expiration or longer when later used. File-upload tools return resource metadata, not file bytes or a download result.

The private verification suite stays active with isolated fixtures and independent native identity/readbacks. It does not publish. Retained draft/media scenarios require separate explicit flags, default false, and record exact reconciliation metadata. Missing live credentials are an unverified state, not a provider-retirement claim.
