# Linkhut Integration Specification

Linkhut is a social bookmarking service. This integration targets the hosted API at `https://api.ln.ht/v1` and uses JSON responses and Bearer authentication.

## Authentication

OAuth uses `https://ln.ht/_/oauth/authorize` and the form-encoded token endpoint `https://api.ln.ht/v1/oauth/token`. Requested scopes are `posts:read`, `posts:write`, `tags:read`, and `tags:write`. Users may change granted scopes during consent; insufficient scope errors come from the provider. The returned scope string is retained. Refresh uses the same token endpoint, preserves the previous refresh token if a replacement is absent, and updates expiry from `expires_in`. A connection without a refresh token must reconnect.

Personal access tokens can be created at `https://ln.ht/_/oauth/personal-token`. OAuth is preferable when connecting someone else's account. No workspace or account identifier is required at setup.

## Tools

| Tool | API method | Behavior |
| --- | --- | --- |
| Add Bookmark | `posts/add` | Creates or replaces a bookmark with title, notes, comma-delimited tags, timestamp, visibility, and unread status. |
| Delete Bookmark | `posts/delete` | Deletes a bookmark by URL. |
| Get Bookmarks | `posts/get` | Fetches bookmarks by day, URL, URL hashes, or tag; can request change signatures. |
| List Recent Bookmarks | `posts/recent` | Fetches up to 100 recent bookmarks, optionally by tag. |
| List All Bookmarks | `posts/all` | Retrieves a page of bookmarks using offset, result count, tag, and inclusive date range filters; can request change signatures. |
| Get Bookmark Hashes | `posts/all?hashes` | Retrieves URL MD5 hashes and change signatures for comparing a local collection with the remote account. |
| Get Tag Suggestions | `posts/suggest` | Returns popular and personalized tag suggestions. |
| List Tags | `tags/get` | Returns each tag and its numeric usage count. |
| Manage Tag | `tags/delete`, `tags/rename` | Removes or renames tags across bookmarks. |
| Check for Updates | `posts/update` | Returns the latest bookmark modification timestamp. |
| Get Bookmark Dates | `posts/dates` | Returns numeric bookmark counts by date. |

All bookmark and tag API methods use GET, including mutations. Mutation responses must contain `result_code: done`; provider failure codes produce structured errors instead of success messages. Optional empty note and tag values are forwarded so callers can clear those fields when replacing a bookmark.

The JSON bookmark property `tags` is exposed through the existing `tag` field. Missing required bookmark data is rejected rather than replaced with placeholder strings or invented visibility/read-later values. Optional `meta` preserves a provider null. Get and recent JSON examples omit response-level `date` and `user`; these fields are optional and are returned only when supplied. Bookmark retrieval tools also retain the original JSON response in `raw`.

Numbers keep their numeric public types. Runtime validation checks pagination ranges and UTC timestamp formats. A date-only Get Bookmarks filter is sent as midnight UTC. API clients space requests using the same token by at least one second within a process. The service's 500/999 throttle responses tell callers to wait before retrying; mutations are not automatically retried.

## Scope and limitations

The documented public API contains posts and tags operations, with no suitable current-user/profile endpoint; no identity tool is invented. Website bookmark import/export does not establish a supported API export endpoint, so no file export tool is advertised. No event subscription endpoint is documented; there are no triggers.

Official references: [Overview and authentication](https://docs.linkhut.org/overview.html), [Posts](https://docs.linkhut.org/posts.html), [Tags](https://docs.linkhut.org/tags.html).
