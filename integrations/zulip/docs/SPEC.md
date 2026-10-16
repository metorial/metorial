# Zulip API Specification

This integration uses the Zulip REST API for Zulip Cloud and self-hosted servers.

## Authentication and identity

Connect with the full server URL, the user's or bot's Zulip API email address,
and its API key. Requests use HTTP Basic authentication with the email as the
username and API key as the password. HTTP self-hosted servers are supported.
Server URLs must not contain embedded credentials, query parameters, or fragments.
The realm belongs to the saved credentials; no second realm setting is required.
API access uses the account's permissions, with no OAuth scopes or token refresh.

Call `get_user` with no inputs to retrieve the authenticated account using
`GET /api/v1/users/me`. Its output includes the account ID, API email, role,
connected server, profile data, and administrator/owner flags when returned.
Specify `userId` or `email` to inspect another accessible profile; `userId` takes
precedence when both are supplied. Real email addresses are only exposed when
Zulip permits the caller to see them.

## Supported tools

| Area | Tools |
| --- | --- |
| Messages | `send_message`, `get_messages`, `get_message`, `update_message`, `delete_message` |
| Reactions and flags | `manage_reactions`, `manage_message_flags` |
| Channels | `list_channels`, `get_channel`, `create_or_subscribe_channel`, `update_channel`, `archive_channel`, `get_channel_topics` |
| Subscriptions | `list_subscriptions`, `manage_subscriptions` |
| Users | `list_users`, `get_user`, `set_user_status`, `get_user_presence` |
| Groups and invitations | `manage_user_groups`, `send_invitation` |
| Files | `upload_file`, `list_files` |
| Server | `get_server_settings` |

Permissions depend on the account role and organization/channel permission
settings. Successful writes do not perform extra reads that could require
additional permissions. Server feature levels determine which newer optional
fields are supported; `get_server_settings` exposes the advertised version and
feature level. These tools cover one Zulip API product.

## Message search and pagination

`get_messages` keeps the default anchor `newest`, with 20 messages before it and
zero after it. Use narrow filters for channels, topics, senders, direct messages,
and full-text search. A filter can be negated. To continue backward, use the
oldest returned message ID as the next anchor; to continue forward, use the
newest returned ID. Set `includeAnchor: false` to avoid repeating that message.
Stop when the corresponding `foundOldest` or `foundNewest` flag is true.
`applyMarkdown: false` requests original Markdown instead of rendered HTML.
The complete response preserves message flags, history limits, and other server
metadata. Other list endpoints return their complete accessible collections
without a pagination cursor.

Reaction metadata exposes actual user IDs and optional emoji namespaces. Pass an
existing reaction's `emojiCode` and `reactionType` when the exact emoji identity
matters. Status emojis accept these identifiers as well. The legacy `away` input
is retained; on modern servers it controls the inverse of presence availability.

## Channel creation compatibility

`create_or_subscribe_channel` calls `POST /api/v1/users/me/subscriptions`.
Zulip creates a missing channel when permitted, or subscribes to an existing one.
The returned `subscribed` and `alreadySubscribed` maps describe actual changes,
keyed by user ID on modern servers and by API email on older servers.
A new subscription does not prove that a channel was newly created.

`create_channel` remains available with its original inputs, outputs, request,
and behavior, but is deprecated in favor of `create_or_subscribe_channel`.
Its original required `created` output inferred channel creation from the
absence of existing subscriptions, which the provider response cannot establish.
Its original `alreadySubscribed` field also retains its legacy mapping.
Use the replacement for accurate subscription outcomes. No provider retirement
is implied by this compatibility deprecation.

## File workflows

`upload_file` accepts a filename and standard base64 file bytes, sends a multipart
upload, and returns the actual provider URL and metadata. Include that URL in
`send_message` content to share the upload. Initially only the uploader can
access it. The file size limit comes from the server configuration; large uploads
may time out. Resumable uploads are not exposed.

`list_files` returns the caller's uploaded file IDs, path IDs, sizes, provider
upload timestamps, and referencing message IDs. Timestamps are returned without
inventing a unit conversion: Zulip 12 feature level 443 changed them from
milliseconds to seconds. Current `message_ids` and older `messages` references
are supported. These tools return metadata and do not download file content.

## Official references

- [REST API overview](https://zulip.com/api/rest)
- [Authentication headers](https://zulip.com/api/http-headers)
- [Get own user](https://zulip.com/api/get-own-user)
- [Get users](https://zulip.com/api/get-users)
- [Get a user](https://zulip.com/api/get-user)
- [Get a user by email](https://zulip.com/api/get-user-by-email)
- [Send messages](https://zulip.com/api/send-message)
- [Get messages](https://zulip.com/api/get-messages)
- [Get one message](https://zulip.com/api/get-message)
- [Edit messages](https://zulip.com/api/update-message)
- [Delete messages](https://zulip.com/api/delete-message)
- [Add reactions](https://zulip.com/api/add-reaction)
- [Remove reactions](https://zulip.com/api/remove-reaction)
- [Personal message flags](https://zulip.com/api/update-message-flags)
- [Get channels](https://zulip.com/api/get-streams)
- [Get channel metadata](https://zulip.com/api/get-stream-by-id)
- [Subscribe and create channels](https://zulip.com/api/subscribe)
- [Unsubscribe](https://zulip.com/api/unsubscribe)
- [Update channels](https://zulip.com/api/update-stream)
- [Archive channels](https://zulip.com/api/archive-stream)
- [Topics](https://zulip.com/api/get-stream-topics)
- [Subscribed channels](https://zulip.com/api/get-subscriptions)
- [Status](https://zulip.com/api/update-status)
- [User presence](https://zulip.com/api/get-user-presence)
- [Organization presence](https://zulip.com/api/get-presence)
- [User groups](https://zulip.com/api/get-user-groups)
- [Create user groups](https://zulip.com/api/create-user-group)
- [Update user groups](https://zulip.com/api/update-user-group)
- [Update group members](https://zulip.com/api/update-user-group-members)
- [Email invitations](https://zulip.com/api/send-invites)
- [Reusable invitations](https://zulip.com/api/create-invite-link)
- [Upload files](https://zulip.com/api/upload-file)
- [Uploaded files](https://zulip.com/api/get-attachments)
- [Server settings](https://zulip.com/api/get-server-settings)
