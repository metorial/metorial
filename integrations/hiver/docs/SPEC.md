# Hiver API integration

Manage shared inboxes, discover their members and tags, and read or update existing conversations.

## Authentication

Use an API key created by an administrator under Developer settings in the Hiver admin panel. The API key is sent as a bearer token to `https://api2.hiverhq.com/v1`. The public reference documents API key authentication; no OAuth flow is configured here.

## Supported workflows

- Discover all shared inboxes, including their display names, email addresses, and channel types.
- Retrieve an inbox and optionally include its members and tags. Discovery follows the provider's pagination tokens.
- Search inbox members by name or email. The integration filters the complete member list because the provider's search endpoint only supports exact email searches.
- Search inbox tags by name, or list all tags.
- Create an inbox tag with an optional hex color and description.
- List conversations one page at a time, returning `nextPage` when available.
- Retrieve a conversation by its Hiver conversation ID or Gmail thread ID, including assignee, tag identifiers, and available conversation links. Supply `userEmail` when using a Gmail thread ID from an individual inbox member's mailbox.
- Update status, assignee, or tags. Status uses `open`, `close`, or `pending`; `closed` remains accepted as an alias for `close`. An assignee ID is resolved to the member's email, or callers may pass `assigneeEmail` directly. The `tags` input replaces the current tag set and accepts tag IDs or unique names discovered from the inbox. Updates are followed by a read because the provider returns no response body on success.

## Limits

The documented API limit is one request per second and 5,000 requests per day per account. Calls within a multi-request operation are spaced one second apart. Other callers using the same account can still exhaust its limits. No automatic retry is performed after an upstream failure.

The public reference does not expose a current-user or account identity endpoint. The integration does not create email conversations, send messages, or expose webhook operations as tools.

## Official references

- [API overview, authentication, pagination, errors, and limits](https://developer.hiverhq.com/hiver-api)
- [List inboxes](https://developer.hiverhq.com/hiver-api/inbox/list-all-the-inboxes)
- [Get inbox](https://developer.hiverhq.com/hiver-api/inbox/get-an-inbox-by-id)
- [Inbox members](https://developer.hiverhq.com/hiver-api/inbox/get-all-users-in-the-inbox)
- [Search inbox members](https://developer.hiverhq.com/hiver-api/inbox/search-users-in-the-inbox)
- [Inbox tags](https://developer.hiverhq.com/hiver-api/inbox/get-tags-in-the-inbox)
- [Search inbox tags](https://developer.hiverhq.com/hiver-api/inbox/search-tags-in-the-inbox)
- [Create inbox tag](https://developer.hiverhq.com/hiver-api/inbox/create-tags-in-the-inbox)
- [List conversations](https://developer.hiverhq.com/hiver-api/conversations/get-conversations-in-the-inbox)
- [Get conversation](https://developer.hiverhq.com/hiver-api/conversations/get-a-conversation-in-the-inbox)
- [Update conversation](https://developer.hiverhq.com/hiver-api/conversations/update-conversation-in-the-inbox)
