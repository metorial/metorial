# Re:amaze Integration

## Authentication

HTTPS Basic Auth uses the user's login email and API token. API requests use `https://{brandSubdomain}.reamaze.io/api/v1`; the subdomain must be a DNS label, not a URL. Permissions follow the authenticated user. There is no OAuth refresh flow.

## Tool surface

The integration exposes 34 tools:

- Conversations: list, get, create, update, add message, list messages.
- Contacts: list, create, update, list identities, create identity.
- Contact notes: list, create, update, delete.
- Articles: list/search, get, create, update.
- Channels: list, get.
- Response templates: list/search, get, create, update.
- Staff: list, create.
- Reports: volume, response time, staff, tags, channel summary through `get_report`.
- Satisfaction ratings: list/filter.
- Status page: list/get/create/update incidents, list systems.

## Conversation history

`list_messages` accepts optional conversationSlug, page (default 1), filter (staff/customer), sentBy, tag, category, numeric origin, startDate, endDate, and includeOriginalBody. It calls the conversation-scoped message endpoint when a slug is supplied, otherwise the brand-wide endpoint.

Each call returns one provider page, newest first, with page/pageSize/pageCount/totalCount/hasMore/nextPage and typed messages. Provider counts can omit the initial message. A full page always continues, even at the reported last page; callers may receive a final empty page. Bodies are not truncated. Messages retain sender, recipients, timestamps, origin/originId, visibility, conversation/channel metadata and attachment metadata. Original HTML is included only when requested and supplied by Re:amaze. File downloads are not performed.

Visibility 0 means regular, 1 internal note, and 2 collision-detected message; other provider values are preserved. Transport origin is not the author's staff/customer role. Pagination must continue until hasMore is false before describing a retrieved thread as complete.

`get_conversation` remains a summary tool. It exposes the initial body plus latest customer and staff summaries, and supports reference/origin lookup. Conversation listing dates filter latest customer-message activity, whereas message listing dates filter message creation. Status help includes codes 0 through 9.

Message and conversation writes expose notification, autoresolve and survey suppression. Message origin IDs support duplicate identification. Brand moves require a destination email channel. Existing create/update assignee payload distinctions are retained.

## Contact and content behavior

Contact identities are typed. Attaching an identity already owned by another contact transfers its associated messages/data; Facebook identity creation is unsupported.

Notes use contact-scoped endpoints and flat body/creator_email/created_at payloads. Create/update responses may contain a single note or a note collection: creation identifies one new matching note against pre-write IDs, and update selects the requested ID. Ambiguous creation never claims a specific note was created. Deletion requires contactIdentifier and noteIdentifier (or the legacy numeric noteId). Note identifiers are opaque strings, including UUIDs; legacy numeric noteId is only returned when safely numeric.

Articles support published/draft/internal status and topic slugs. Response templates support personal/shared visibility. Staff listing is paginated; creation accepts an optional password, can affect billing, and sends no invitation email.

Reports and satisfaction ratings default to all account brands; optional brand filters retain that provider behavior. Ratings support creation/update date filters. Existing numeric identifiers are normalized from decimal strings only when safe; malformed or unsafe values produce an actionable error rather than losing precision. Incidents and systems expose canonical string identifiers, including UUIDs, alongside optional legacy numeric aliases. Incident update and system-association identifiers are retained for follow-up changes.

## Compatibility and release

Version 0.2.0 preserves existing tool keys, field types and enum meanings, adding optional fields and eight tools. All input schemas are top-level objects. Validation and API failures produce structured service errors. Requests have bounded timeouts and do not automatically retry writes.

Event triggers are unchanged in this tools-only release; their modernization is tracked separately.

## Provider references

- [API introduction and resource index](https://www.reamaze.com/api)
- [Conversation summaries](https://www.reamaze.com/api/get_conversation)
- [Messages and pagination](https://www.reamaze.com/api/get_messages)
- [Contact notes](https://www.reamaze.com/api/get_notes)
- [Contact identities](https://www.reamaze.com/api/post_identities)
- [Satisfaction ratings](https://www.reamaze.com/api/get_satisfaction_ratings)
