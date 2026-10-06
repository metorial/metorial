# Slite API behavior

The supported host is `https://api.slite.com/v1`, with the API-key header documented by the official setup guides. The machine-readable schema describes bearer security instead; this discrepancy does not justify silently changing working credentials or inventing OAuth support.

| Capability | Native route |
| --- | --- |
| Current profile | GET `/me` |
| Note create/list | POST/GET `/notes` |
| Note read/update/permanent delete | GET/PUT/DELETE `/notes/{noteId}` |
| Child discovery | GET `/notes/{noteId}/children` |
| Search | GET `/search-notes` |
| Verification/outdated/archive/owner | PUT `/notes/{noteId}/verify`, `/flag-as-outdated`, `/archived`, `/owner` |
| Existing tile update | PUT `/notes/{noteId}/tiles/{tileId}` |
| User/group lookup/search | GET `/users`, `/users/{userId}`, `/groups`, `/groups/{groupId}` |
| Content audits | GET `/knowledge-management/notes` and `/public`, `/inactive`, `/empty` |
| Ask submission | GET `/ask` (can create a retained conversation) |
| Existing Ask thread | GET `/threads/{threadId}` |
| Existing custom index | GET/POST/DELETE `/ask/index` (provider-deprecated, feature gated) |

Native cursor pages preserve `total`, `hasNextPage`, and nullable `nextCursor`. Search/index pages preserve zero-based `page` and `nbPages`. Missing or contradictory metadata is refused rather than converted into a complete page. Opaque resource IDs remain exact strings and are encoded as one path segment.

Read/update/lifecycle receipts must match the requested resource. Collection attribute receipts must confirm requested non-null values. API responses and errors are checked for credential reflection before a successful result. Provider failure messages do not retain raw transport parents or bodies.

The current note body is returned as JSON by the API, so file delivery extracts its native content into a bounded file. No signed provider download URL or renewable URL is documented. The downloadable-content bound is 16 MiB; the HTTP response bound is 32 MiB. Provider 413 responses can impose smaller document limits.

No new triggers, administrative people/group management, approval mutation, custom root provisioning, bulk recursion, or unsupported identity fields are provided.
