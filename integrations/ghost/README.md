# Ghost

Read and manage posts, pages, tags, members, newsletters, promotional offers and webhooks. Browse tiers and staff, validate the current connection, read exact tier or user details, and download an HTML or JSON snapshot of one post or page.

Connect with a Custom Integration Admin key or original staff access key (`id:hex-secret`) and the HTTPS Ghost Admin site URL, including any site subdirectory. The Admin domain can differ from the public site domain. Both key types sign a fresh JWT for each request. Staff permissions depend on the role; integration permissions are fixed. A previously generated JWT is not a durable connection credential and must be replaced with the original key. No OAuth or automatic key rotation is provided.

A Content API key offers published-content reads. On supported read tools, `api: content` explicitly selects an optional Content key supplied with an Admin connection; it never falls back to Admin or provides Admin writes. Existing connections retain validated `adminDomain` config fallback; reconnect to bind the URL to credentials. The site endpoint alone is public and does not validate credentials. `get_current_context` also makes an authenticated content read and returns a native user only for a declared staff connection.

The fifteen legacy tool keys remain available. Added tools are `get_current_context`, `get_resource` (tier or staff user by exact ID), and `export_content` (one current post/page as HTML or JSON, at most 16 MiB). Exports are local snapshots, not backups, PDF rendering, or historical revisions. HTML conversion on writes is lossy; explicitly set `source: html`. Updating content requires the last known `updatedAt`. Tag and author relations replace existing relations, and unmatched tag names may create new tags. Publishing and scheduling can produce irreversible email and webhook effects.

Browse tools return native pagination. Legacy `limit: 0` is translated to Ghost's `all` value, subject to the response size bound; no automatic paging or retry is performed. Sparse field selections preserve omitted fields instead of inventing values. Financial values remain exact native minor currency units; values outside JavaScript's safe range are refused.

Webhook resources have no independent GET/list endpoint. Creation receipts supply their exact IDs; updating/deleting integration webhooks is restricted by Ghost to the authenticated integration. Successful deletion does not undo deliveries. Newsletter sender changes may send verification mail and remain pending; native verification metadata is returned. Archived newsletters and offers remain in Ghost. Deleting members does not promise removal of Stripe, mail, analytics, or other external records.

Images, themes, uploads, broad site administration, sessions, trigger subscriptions and key refresh are outside this integration's tool surface.
