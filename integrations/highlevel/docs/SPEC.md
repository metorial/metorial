# HighLevel integration specification

## Release boundary

The integration contains 37 tools: the 36 documented capabilities in HighLevel's [older MCP article](https://help.gohighlevel.com/support/solutions/articles/155000005741-how-to-use-the-highlevel-mcp-server) plus calendar discovery. Tool keys replace the article's hyphens with underscores. Production identifiers add `highlevel-` and remain below 60 characters.

This is documented capability parity, not an assertion of identical MCP schemas. The article does not expose full schemas; the hosted MCP catalog was not verified. The [newer MCP discovery/execution system](https://marketplace.gohighlevel.com/docs/other/mcp/), agency-wide connections, triggers, and additional business operations are excluded.

## Transport, authentication, and account context

All 37 operations use `https://services.leadconnectorhq.com` and `Version: v3`. Paths below are used as documented, without adding `/v3`. OAuth token exchange and refresh use form-encoded `POST /oauth/token`. API requests carry the bearer credential, use a bounded timeout, and do not automatically replay writes. Redirects are disabled. Provider errors preserve safe status, trace, retry, and rate-limit details; secrets are redacted. Burst and daily exhaustion remain distinguishable when HighLevel supplies the relevant headers.

Every connection belongs to one sub-account. OAuth requests Location credentials and rejects agency/bulk installations; it persists account identifiers, granted scopes, expiration, and refreshed credentials. Refresh cannot explicitly change the account. Private-token setup requires a token created inside the intended sub-account; agency-created tokens are unsupported. It accepts that token and an HTTPS dashboard URL, extracts the location identifier, and verifies access through `GET /locations/{locationId}` on the fixed HighLevel API host. This verifies access to the selected account, not the token's creation level or grants; no token-type/grant introspection is claimed. The supplied URL is never contacted. Both methods require `locations.readonly` for identity validation. Tools reject explicit conflicting location context. OAuth grants are checked per action; private-token grants remain provider-enforced.

## Tool inventory

Every row uses API version **v3**. Status **L** means the corresponding OAuth and Private Integration Token live scenarios passed on 2026-10-26; this does not establish every input variant or pagination case. **D/L** means documented and implemented, but successful live execution remains pending. **L (content)** covers HTML/text template creation only; URL import remains pending. Read-only metadata follows behavior, including search/list/statistics operations that use POST.

| Tool key | REST operation | OAuth scope | Access | Pagination | Verification |
| --- | --- | --- | --- | --- | --- |
| `calendars_get_calendar_events` | `GET /calendars/events` | `calendars/events.readonly` | Read | Explicit time interval; none documented | L |
| `calendars_get_appointment_notes` | `GET /calendars/appointments/{appointmentId}/notes` | `calendars/events.readonly` | Read | `limit`/`offset`, `hasMore`, `nextOffset` | D/L |
| `calendars_get_calendars` | `GET /calendars/` | `calendars.readonly` | Read | None documented | L |
| `contacts_get_all_tasks` | `GET /contacts/{contactId}/tasks` | `contacts.readonly` | Read | None documented | L |
| `contacts_add_tags` | `POST /contacts/{contactId}/tags` | `contacts.write` | Write | Not applicable | L |
| `contacts_remove_tags` | `DELETE /contacts/{contactId}/tags` with JSON body | `contacts.write` | Write | Not applicable | L |
| `contacts_get_contact` | `GET /contacts/{contactId}` | `contacts.readonly` | Read | Single resource | L |
| `contacts_update_contact` | `PUT /contacts/{contactId}` | `contacts.write` | Write | Not applicable | L |
| `contacts_upsert_contact` | `POST /contacts/upsert` | `contacts.write` | Write | Not applicable | L |
| `contacts_create_contact` | `POST /contacts/` | `contacts.write` | Write | Not applicable | L |
| `contacts_get_contacts` | `POST /contacts/search` | `contacts.readonly` | Read | `pageLimit` with `page` or `searchAfter` | L |
| `conversations_search_conversation` | `GET /conversations/search` | `conversations.readonly` | Read | `limit`, provider sort value `startAfterDate` | L |
| `conversations_get_messages` | `GET /conversations/{conversationId}/messages` | `conversations/message.readonly` | Read | `limit`, `lastMessageId`, `nextPage` | L |
| `conversations_send_a_new_message` | `POST /conversations/messages` | `conversations/message.write` | Write | Not applicable | D/L |
| `locations_get_location` | `GET /locations/{locationId}` | `locations.readonly` | Read | Single resource | L |
| `locations_get_custom_fields` | `GET /locations/{locationId}/customFields` | `locations/customFields.readonly` | Read | None documented | L |
| `opportunities_search_opportunity` | `GET /opportunities/search` | `opportunities.readonly` | Read | `page` or provider `startAfter`/`startAfterId`; preserve `meta` | L |
| `opportunities_get_pipelines` | `GET /opportunities/pipelines` | `opportunities.readonly` | Read | None documented | L |
| `opportunities_get_opportunity` | `GET /opportunities/{id}` | `opportunities.readonly` | Read | Single resource | L |
| `opportunities_update_opportunity` | `PUT /opportunities/{id}` | `opportunities.write` | Write | Not applicable | L |
| `payments_get_order_by_id` | `GET /payments/orders/{orderId}` | `payments/orders.readonly` | Read | Single resource | D/L |
| `payments_list_transactions` | `GET /payments/transactions` | `payments/transactions.readonly` | Read | `limit`/`offset`, `totalCount`, `nextOffset` | L |
| `blogs_check_url_slug_exists` | `GET /blogs/posts/url-slug-exists` | `blogs/check-slug.readonly` | Read | Single result | L |
| `blogs_update_blog_post` | `PUT /blogs/posts/{postId}` | `blogs/post-update.write` | Write | Not applicable | L |
| `blogs_create_blog_post` | `POST /blogs/posts` | `blogs/post.write` | Write | Not applicable | L |
| `blogs_get_all_blog_authors_by_location` | `GET /blogs/authors` | `blogs/author.readonly` | Read | `offset`/`limit`, total `count` | L |
| `blogs_get_all_categories_by_location` | `GET /blogs/categories` | `blogs/category.readonly` | Read | `offset`/`limit`, total `count` | L |
| `blogs_get_blog_post` | `GET /blogs/posts/all` | `blogs/posts.readonly` | Read | `offset`/`limit`, total `count` | L |
| `blogs_get_blogs` | `GET /blogs/site/all` | `blogs/list.readonly` | Read | `skip`/`limit`; full-page continuation can end empty | L |
| `emails_create_template` | `POST /emails/locations/{locationId}/templates` or `/templates/import` | `emails/templates.write` | Write | Not applicable | L (content) |
| `emails_fetch_template` | `GET /emails/locations/{locationId}/templates` | `emails/templates.readonly` | Read | `offset`/`limit` (maximum 20), `total` | L |
| `socialmediaposting_get_account` | `GET /social-media-posting/{locationId}/accounts` | `socialplanner/account.readonly` | Read | None documented | L |
| `socialmediaposting_get_social_media_statistics` | `POST /social-media-posting/statistics` | `socialplanner/statistics.readonly` | Read | Date/account-bounded report | D/L |
| `socialmediaposting_create_post` | `POST /social-media-posting/{locationId}/posts` | `socialplanner/post.write` | Write | Not applicable | D/L |
| `socialmediaposting_get_post` | `GET /social-media-posting/{locationId}/posts/{id}` | `socialplanner/post.readonly` | Read | Single resource | D/L |
| `socialmediaposting_get_posts` | `POST /social-media-posting/{locationId}/posts/list` | `socialplanner/post.readonly` | Read | String `skip`/`limit`, `results.count` | L |
| `socialmediaposting_edit_post` | `PUT /social-media-posting/{locationId}/posts/{id}` | `socialplanner/post.write` | Write | Not applicable | D/L |

## Behavioral adaptations

Contact search uses the supported search operation instead of the deprecated contact list route. Its [supplemental specification](https://doc.clickup.com/8631005/d/h/87cpx-158396/6e629989abe7fad) was retrieved from the public document linked by HighLevel. One-based page pagination and typed cursor pagination are mutually exclusive. `pageLimit` is 1–500, query text is limited to 75 characters, and sorting accepts at most two rules. Preserve the last contact’s `searchAfter` array unchanged. Standard pagination is limited to 10,000 records; search indexing can lag writes. The tool exposes equality, inequality, substring, and existence predicates with one level of AND/OR grouping. Deeper, range, and nested opportunity predicates are outside this first-release subset. Contact updates preserve omitted fields and intentional nulls supported by the API. A supplied tag list replaces existing tags. Additional email/phone changes require their primary address in the same request, including an empty replacement list. Upsert follows the account’s duplicate-matching rules; matching email and phone to different existing contacts does not guarantee which record is selected.

Calendar discovery supplies IDs and names. Events require a calendar, group, or user selector and an increasing interval expressed in milliseconds. Appointment-note paging uses the provider's `hasMore`, with a maximum page size of 20. The connected-location identity tool requires no opaque configuration value.

Messaging uses a top-level object with channel-specific fields and runtime branch checks. Scheduled timestamps remain seconds. Outputs identify the accepted request and conversation/message resources without claiming delivery. Conversation search only exposes continuation when the provider returns the final row's exact sort value, retaining scalar or array cursors; its response documentation omits those sort fields, so live continuation remains unverified. Opportunity updates omit unspecified values. Empty opportunity searches can return `nextPage: ""` with null cursor fields; preserve that sentinel instead of coercing it. Continue only with a numeric `nextPage` or the returned `startAfter`/`startAfterId` pair; never convert a continuation URL to a page number. Payments derive account context from the connection; transactions use `altType=location`.

Blog mutations require explicit state and use provider draft, scheduling, publication, archive, and deletion semantics. Blog update is marked destructive because its status input can archive/delete. The legacy `blogs_get_blog_post` key lists posts by blog ID. Writes require complete `rawHTML`; supplied category/tag arrays replace their values. Scheduled creation uses `publishedAt`, while scheduled updates use `scheduledAt` (ISO 8601). Creation accepts the live `blogPost` envelope and documented `data`; updates use `updatedBlogPost`. A malformed response can follow a successful write, so inspect existing posts before retrying. Email creation separates content and import modes inside one object schema; imports accept the documented Mailchimp and ActiveCampaign providers. Template creation/import returns a flat resource; listing returns `items`/`total` with a maximum page size of 20. Current operation-specific `emails/templates.*` scopes take precedence over the older email-builder routes still shown in the aggregate scope table. HighLevel performs URL imports; this integration does not fetch the supplied URL. Email template creation does not send messages.

Social list and statistics requests remain read-only despite POST. List offsets and limits remain strings. Social statistics require at least one connected profile ID. Social mutations require connected account IDs, an authoring user (defaulting to the OAuth user when available), explicit publishing state, and typed platform options; restrictions vary by platform. Live OAuth validation rejected omitted account IDs/user IDs even for drafts, despite the documentation marking them optional. Provider acceptance does not prove publication. Scheduled/review posts require a schedule, and review also requires an approver. Published LinkedIn polls cannot be edited. Mixed-platform posts may be truncated to the strictest caption/media limits; Instagram requires media, Reels/YouTube require one video, and directly published Facebook/Instagram stories omit captions. Current nested schemas take precedence over stale examples (`pinterestBoards`, `privacyLevel`, `showOnFeed`, and `post`).

## Evidence and validation

Current provider references for non-obvious contracts:

- [API version header and paths](https://marketplace.gohighlevel.com/docs/Versioning/)
- [OAuth lifecycle](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/) and [scope registry](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/)
- [Contact search](https://marketplace.gohighlevel.com/docs/ghl/contacts/search-contacts-advanced/) and [update safeguards](https://marketplace.gohighlevel.com/docs/ghl/contacts/update-contact/)
- [Appointment notes](https://marketplace.gohighlevel.com/docs/ghl/calendars/get-appointment-notes/)
- [Conversation search](https://marketplace.gohighlevel.com/docs/ghl/conversations/search-conversation/) and [opportunity pagination](https://marketplace.gohighlevel.com/docs/ghl/opportunities/search-opportunity/)
- [Blog creation](https://marketplace.gohighlevel.com/docs/ghl/blogs/create-blog-post/) and [updates](https://marketplace.gohighlevel.com/docs/ghl/blogs/update-blog-post/)
- [Email creation](https://marketplace.gohighlevel.com/docs/ghl/emails/create-email-template/), [import](https://marketplace.gohighlevel.com/docs/ghl/emails/import-email-template/), and [listing](https://marketplace.gohighlevel.com/docs/ghl/emails/list-email-templates/)
- [Social statistics](https://marketplace.gohighlevel.com/docs/ghl/social-planner/get-statistics.md), [post schemas](https://marketplace.gohighlevel.com/docs/ghl/social-planner/create-post/), and [platform restrictions](https://help.leadconnectorhq.com/support/solutions/articles/48001240003-social-planner-image-video-content-and-api-limitations)

The private suite lives at `tests/integrations/highlevel/tools.e2e.ts` in the enterprise repository. It exercises fixture-backed reads and suite-owned mutations with cleanup where available. Messaging and public publication require explicit authorized test destinations. Missing credentials/fixtures are unverified coverage. Branching input schemas have permitted regression tests in the package; ordinary provider behavior belongs in the live suite.

On 2026-10-26 the full suite passed independently with **31 passed / 8 skipped** across 39 scenarios for **OAuth**, and **31 passed / 8 skipped** for **Private Integration Token**. Each run asserted and logged its active authentication type. Successful mutations covered contact create/read/update/tag/upsert, opportunity update, HTML/text templates, and blog draft create/update/list; cleanup completed and read-only audits found no owned contacts, opportunities, or templates remaining. A supported profile-CLI refresh persisted new access and refresh tokens while preserving location, user, and grants.

Skipped coverage: appointment notes (no appointment within the discovered interval and no write grant to seed one), outbound messaging (no authorized destination), order read (order discovery returned no records), URL import (no dedicated provider template URL), and four social operations (no connected social account). The user supplied a test blog; its location matched the connection and API discovery verified it before mutations. Live create returned `blogPost` rather than the documented `data` envelope; both are now supported and malformed responses produce actionable errors. Three drafts created before this mapping failure were identified and removed; no active probe drafts remain. Invalid or mismatched private-token setup, public publication/delivery, revoked scopes, transport ambiguity, and rate-limit exhaustion remain unverified. Pagination was followed where the live account returned continuation; empty lists do not establish multi-page behavior. Release checks include the affected integration build, schema regression tests, root formatting/lint, and diff hygiene.

Suite-owned resource creation is attempted once per resource and authentication-run context. A failed creation remains failed for later dependent scenarios, avoiding duplicate writes after an uncertain response. Unexpected implementation exceptions hard-fail this suite rather than being classified as retryable upstream skips.

After adding the resource-attempt guard, the final OAuth run again passed 31/39 with 8 setup skips. The private-token run passed 30/39 with the same 8 setup skips plus one transient HTTP 429 on custom-field discovery; a focused retry of that read passed for both methods.
