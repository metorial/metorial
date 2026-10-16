# Typefully integration specification

The integration uses [Typefully API v2](https://typefully.com/docs/api) at `https://api.typefully.com/v2`. API keys are created in Settings → API and sent as `Authorization: Bearer <key>`. Keys inherit the user permissions; v1 keys are incompatible with v2. No OAuth refresh or account-scoping configuration is required. See the [official v1 → v2 guide](https://support.typefully.com/en/articles/13133296-typefully-api-v1-v2-migration-guide).

## Discovery and identity

`get_current_user` reads `/me` and returns only documented identity fields. `list_social_sets` supports limit/offset pagination; `get_social_set` exposes connected platform details. Pass discovered social set IDs to content tools. Public draft and social set IDs remain strings, including when Typefully returns numeric IDs.

## Drafts

Create, read, list, update, and delete drafts for X, LinkedIn, Threads, Bluesky, and Mastodon. Supply each platform posts array explicitly; each platform may carry its documented settings. List filters include draft, planned, scheduled, publishing, published, and error states. Tag inputs accept provider tag slugs returned by `manage_tags`. Use optional `orderBy` for documented draft ordering (`created_at`, `updated_at`, `scheduled_date`, or `published_at`, with a leading minus for descending order). Omission leaves the provider default intact. The legacy `sort` field still forwards unchanged; its current provider acceptance is unverified. Supplying both fields is rejected to avoid ambiguous precedence.

`publishAt` accepts `now`, `next-free-slot`, or an ISO datetime. Publishing with `now` is asynchronous; inspect `publishState` and poll `get_draft` until finished before checking status and URLs. `planAt` supports a future datetime or `next-free-slot` without auto-publication. It is mutually exclusive with `publishAt`. Updating with `planAt: null` clears an existing planned or scheduled date, subject to provider permissions.

Draft edits preserve comment-thread markers by default. `get_draft` can request plain display text with `excludeCommentMarkers`, but that text should not be sent back for editing. `forceOverwriteComments` explicitly allows resolving threads whose anchor markers were removed. The complete provider draft response is available in `rawDraft`.

## Queue

`get_queue` retrieves date-range slots and scheduled/planned drafts; dates use the social set timezone and ranges cannot exceed 62 days. Planned drafts remain inert. `get_queue_schedule` reads timezone and local posting rules; the provider may initialize defaults on first read. `replace_queue_schedule` atomically replaces all rules, requires ADMIN access, and accepts an empty rule list. Duplicate weekday/time combinations and fractional hours/minutes are rejected.

## Media and tags

`upload_media` initiates uploads or checks processing. Send raw file bytes to the returned presigned URL using PUT with no extra headers. Optional alt text can be provided at initiation. `update_media` sets or clears alt text before media is attached; existing draft media must be sent again through draft update to refresh every platform snapshot. Processing URLs are actual provider values; this workflow does not download or host files.

`manage_tags` creates tags or lists a limit/offset page. Current v2 tags expose a slug instead of a numeric ID. The public `tagId` retains a legacy `id` when present and otherwise returns the actual provider slug; `tagSlug` makes draft assignment explicit. No identifier is synthesized.

## Collaboration

List comment threads (unresolved by default), create anchored threads, reply, and resolve discussions. Anchors use exact selected text, a zero-based post index, and an optional occurrence. Use post index 0 for X Articles. LinkedIn mentions must remain atomic. Auto-synced platforms do not permit new threads; resolved threads do not accept replies. Resolution is one-way.

## Boundaries

Existing tool IDs, scalar types, defaults, and routes remain available. Additional API capabilities such as LinkedIn organization resolution, comment editing/deletion, and specialized Substack/X Article draft authoring are not exposed as dedicated actions. Webhook configuration is available in the Typefully UI; this integration does not register triggers. No API v1 tool is replaced or redirected.
