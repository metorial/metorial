# Heartbeat API

Heartbeat is a single community platform. Its public API uses the base URL
`https://api.heartbeat.chat/v0` and `Authorization: Bearer <API_KEY>` on every
request. API keys are created in Settings > System > API Keys. There is no OAuth
exchange or refresh flow and no community ID configuration. The public reference
does not document a current-user, API-key-owner, or current-community identity
operation, so the integration does not infer an identity from arbitrary members.

Sources:

- [Authentication](https://heartbeat.readme.io/reference/authorization)
- [API availability and key creation](https://help.heartbeat.chat/hc/en-us/articles/33257714954001-Heartbeat-API)
- [User listing](https://heartbeat.readme.io/reference/getusers)
- [User creation](https://heartbeat.readme.io/reference/createuser)
- [User update](https://heartbeat.readme.io/reference/updateuser)
- [Member lookup](https://heartbeat.readme.io/reference/finduser)
- [Group membership](https://heartbeat.readme.io/reference/addtogroup)
- [Channel listing](https://heartbeat.readme.io/reference/getchannels)
- [Channel thread listing](https://heartbeat.readme.io/reference/getthreads)
- [Thread creation](https://heartbeat.readme.io/reference/createthread)
- [Comment creation](https://heartbeat.readme.io/reference/createcomment)
- [Event creation](https://heartbeat.readme.io/reference/createevent)
- [Invitation creation](https://heartbeat.readme.io/reference/createinvitation)
- [Direct messages](https://heartbeat.readme.io/reference/createdirectmessage)

## Current operations

| Capability | Tools | Documented requests |
| --- | --- | --- |
| Members | `list_community_members`, `find_members` | GET `/users`, `/users/{userID}`, `/find/users?email=...` |
| Roles | `list_roles` | GET `/roles` |
| Member creation and profile | `provision_member`, `edit_member_profile` | PUT `/users` with full name and one role ID; POST `/users` with existing email |
| Member access | `change_member_access` | DELETE `/users` or POST `/users/reactivate`, both with email in the body |
| Access groups | `list_access_groups`, `create_access_group` | GET or PUT `/groups` |
| Group membership | `manage_group_memberships` | PUT or DELETE `/groups/{groupID}/memberships`, with member emails |
| Invitation links | `list_invitations`, `create_invitation_link` | GET or PUT `/invitations`; creation returns the actual invitation code |
| Channels | `list_community_channels`, `list_channel_categories`, `create_community_channel` | GET `/channels` or `/channelCategories`; PUT `/channels` or `/voiceChannels` |
| Threads | `list_channel_threads`, `get_thread`, `post_thread` | GET `/channels/{channelID}/threads` or `/threads/{threadID}`; PUT `/threads` |
| Comments | `post_comment` | PUT `/comments`, with a nullable parent comment ID |
| Events | `list_events`, `get_event`, `schedule_event` | GET `/events` or `/events/{eventID}`; PUT `/events` |
| Direct messages | `send_direct_message` | PUT `/directMessages`, with `text`, `to`, and optional admin `from` |

Member, role, group, channel, category, invitation, and event list endpoints return
arrays. The thread list has cursor pagination with `limit` from 1 to 100, default
20, and `startingAfter`. Its result is also an array without a `hasMore` field.
The returned `nextStartingAfter` is the last actual thread ID and does not prove
that another nonempty page exists. No omitted pagination default is sent.

Output profiles use the documented field names and preserve additional provider
metadata. User groups are objects, the user role is a name, channels use
`POSTS`/`CHAT`/`VOICE`, and events use `startTime`/`endTime`. File URLs and thread
permalinks remain actual provider values. These reads expose resource metadata;
they do not fetch file contents or synthesize download URLs.

Writes whose reference declares only a successful HTTP response return the
actual `httpStatus` and complete `response`, if any. They do not infer IDs,
creation timestamps, delivery, or workflow completion. Thread/comment and
invitation creation have documented object responses and return those objects.
Event creation forwards the supplied numeric duration; the public schema does
not specify its unit, so the integration does not guess or derive it. Location
values `HEARTBEAT` and `ZOOM` have special provider meaning; other strings remain
custom locations. A Zoom integration must already exist for `ZOOM`.

## Compatibility of original tools

The original `find_user`, `list_members`, `deactivate_member`, `manage_group`,
`list_groups`, `create_thread`, `create_comment`, and `list_channels` remain active.
Their input field types, requiredness, enums, defaults, constraints, and meanings
are preserved. Array responses and current provider field names are mapped to the
original output names. Full provider responses are also retained in `raw`.

- Member group objects map to their actual group IDs; legacy string IDs and null
  groups remain intact. A provider role name is never substituted for a role ID.
- Lists accept both the documented array and the previous data/hasMore envelope.
  A real envelope's `hasMore` value is preserved, including false. An array does
  not provide that fact, so no `hasMore` value is inferred.
- Existing member, group, and channel filters and pagination arguments are
  forwarded unchanged. Their effect is not documented or live-verified; the
  integration does not silently remove them or claim the provider applies them.
- Group `parentGroupID` maps to `parentGroup`, preserving a real null. Channel
  types `POSTS`, `CHAT`, and `VOICE` map to `thread`, `chat`, and `voice`.
- Access and group membership tools retain user-ID inputs. They first resolve
  the email with GET `/users/{userID}` using the same API key, then send the
  documented email body. No additional scope is documented. A lookup failure
  preserves its ServiceError and stops before any mutation; no email, permission,
  or successful result is guessed. Reactivation does not require a returned user
  profile and always preserves the requested user ID in output.
- Group creation uses PUT and the documented `parentGroupID` casing. Returned
  group IDs and names remain optional and are exposed only when present.
  Membership writes retain the sibling-removal boolean, including explicit false.
  The original validation messages and falsy branches remain, using ServiceError.
- Thread and comment creation use PUT and map IDs to `channelID`, `threadID`, and
  `userID`. A supplied `richText` takes precedence over `text`, including an empty
  string. No missing content is fabricated. Thread `title` stays accepted and is
  forwarded unchanged, although its effect is not documented. Direct thread
  comments send `parentCommentID: null` and return the actual requested thread ID.
- Direct messaging maps the recipient to `to`, with optional admin sender `from`.

Twelve original required output fields become optional without changing their types:
`find_user.users[].roleId`, `find_user.users[].createdAt`,
`list_members.users[].roleId`, `list_members.users[].createdAt`,
`list_members.hasMore`, `list_groups.groups[].isJoinable`,
`list_groups.groups[].parentGroup`, `list_groups.hasMore`,
`list_channels.channels[].isReadOnly`, `list_channels.channels[].createdAt`,
`list_channels.channels[].channelType`, and `list_channels.hasMore`. The official success schemas either do not provide those
fields or declare them without requiring their presence. Actual present values are retained; absent values are omitted, with the
complete original response available in `raw`. Missing roles, timestamps,
parent IDs, channel types, joinability, read-only flags, or pagination state are
never invented.

## Five retained legacy contracts

Five original tools retain their exact original handlers and request contracts
with formal deprecation guidance. Fulfilling their existing accepted inputs with
the current API would require a new required value or change a field's meaning.
These are compatibility decisions, not claims that old endpoints have retired.

| Legacy tool | Current workflow | Contract difference |
| --- | --- | --- |
| `create_member` | `provision_member` | Current creation requires a full name and one role ID; old inputs permit email alone |
| `update_member` | `edit_member_profile` | Current update uses an existing email as selector; the old email field means a new email address |
| `create_channel` | `create_community_channel` | Current creation requires a channel category absent from the original input |
| `create_event` | `schedule_event` | Current creation requires duration and location; old name/start-date-only calls lack both |
| `get_recent_posts` | `list_channel_threads` | Current thread listing needs a channel; the old input permits community-wide calls |

The unchanged `send_invitation` tool is not formally deprecated: absence of its
request from the current public reference does not establish retirement. It
remains an unverified legacy email-delivery workflow. Invitation link creation
is an independent alternative workflow and does not send an email. No permission
scopes or account identities are guessed. The single community API does not need
separate product categories. Webhook registration and inbound triggers are
outside this tool refresh.
