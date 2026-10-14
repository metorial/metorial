# Stormboard integration

Stormboard supports collaborative digital whiteboards with ideas, sections,
templates, connectors, tags, chat, and participants.

## Authentication

The integration uses an API key in the `X-API-Key` header. Retrieve the key from
the API tab in your [Stormboard account](https://www.stormboard.com/users/account#api).
The provider's [authentication documentation](https://api.stormboard.com/docs/auth)
uses `GET /users` to identify the connected user.

The configuration schema is empty. No workspace or team ID is required to
connect. Team Storm creation accepts a team ID as tool input. OAuth clients
require contacting Stormboard support and are not implemented by this integration.

## Implemented tools

| Tool | Capability |
| --- | --- |
| `list_storms` | List Storms accessible to the connected user. |
| `create_storm` | Create a Storm; a team plan requires `teamId`. |
| `get_storm` | Retrieve Storm metadata. |
| `manage_storm_status` | Close, reopen, duplicate, favorite, or unfavorite a Storm. |
| `list_ideas` | Retrieve the ideas in a Storm. |
| `create_idea` | Create an idea with content, type, and color. |
| `get_idea` | Retrieve an idea's content and position metadata. |
| `get_storm_template` | Retrieve a Storm's template structure. |
| `update_storm_section` | Update section properties or a legend label. |
| `manage_connectors` | List, create, update, or delete connectors. |
| `manage_tags` | List or create tags and read or apply idea tag data. |
| `manage_chat` | List or send chat messages and retrieve or mark unread messages. |
| `manage_participants` | List or invite participants, accept or decline invitations, join a Storm, or check access. |
| `get_user_profile` | Read the connected user's profile. |

These tools preserve their existing input and output field types. Required
action-specific fields and empty update requests produce actionable errors.
Unexpected collection responses are reported as errors instead of being presented
as successful empty lists. Nullable optional metadata is omitted from typed outputs.

## Provider documentation and limits

The [API overview](https://api.stormboard.com/) documents request errors,
HTTP methods, timestamps, rate limiting, and subscription-dependent access.
`401` may reflect a plan restriction; `403` may reflect access or authentication.

At the October 13, 2026 review, the public documentation's API Reference section
exposed no endpoint details. The [official GitHub organization](https://github.com/stormboard)
linked from the overview exposed no public repositories. Existing endpoint paths,
HTTP methods, and request fields were retained; their individual payload contracts
could not be independently checked against a current public endpoint reference.
No additional tools were added without that evidence. Team-ID discovery and
pagination contracts remain unverified.

The integration does not implement idea updates or deletion, profile editing,
or webhook triggers. API availability and permissions can depend on the connected
user's subscription. No live-provider calls were made for this refresh.
