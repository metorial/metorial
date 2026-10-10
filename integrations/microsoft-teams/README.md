# <img src="https://provider-logos.metorial-cdn.com/microsoft-teams.svg" height="20"> Microsoft Teams

Send, read, update, and delete messages in channels and chats. Create and manage teams, channels, and memberships. Schedule and manage online meetings, access call recordings and transcripts. Monitor user presence status in real time. Manage shifts, schedules, and time-off requests for frontline workers. Install and configure apps and tabs within teams. Send activity feed notifications to users. Create and manage tags for @mentioning user groups. Generate usage reports and import historical message data from other platforms.

## Tools

### Create Team

Create a new Microsoft Team. The team is provisioned asynchronously; the response includes a tracking URL. You can specify visibility, description, and member/messaging settings.

### Delete Team

Permanently delete a Microsoft Team and its associated Microsoft 365 group. This action is irreversible.

### Get Presence

Get the presence status (availability and activity) of one or more users in Microsoft Teams. Can query the authenticated user's own presence or other users by their IDs.

### Get Team

Retrieve detailed information about a specific Microsoft Team, including its settings, visibility, and member settings.

### List Channel Messages

List recent messages in a team channel. Returns message content, sender information, and timestamps. Optionally fetch replies for a specific message.

### List Channels

List all channels in a Microsoft Team. Returns channel names, descriptions, types (standard, private, shared), and membership type.

### List Chat Messages

List recent messages in a specific chat. Returns message content, sender info, and timestamps.

### List Chats

List the authenticated user's chats in Microsoft Teams. Returns chat type (oneOnOne, group, meeting), topic, and last updated time.

### List Teams

List all Microsoft Teams that the authenticated user has joined. Returns basic team properties including display name, description, and visibility.

### Manage Channel

Create, update, or delete a channel in a Microsoft Team. Supports standard, private, and shared channel types. Use this tool to manage the lifecycle of team channels.

### Manage Members

List, add, or remove members from a Microsoft Team or a specific channel. Supports adding members as owners or regular members.

### Manage Online Meeting

Create, get, update, or delete a Microsoft Teams online meeting. Can schedule meetings with a start/end time, subject, and participants.

### Manage Shifts

Manage workforce shifts for a Microsoft Team. Can view the team's schedule, list existing shifts, create new shifts, or delete shifts. Useful for frontline worker scheduling.

### Manage Tags

Create, list, update, or delete tags for a Microsoft Team. Tags group users and enable @mentions for subsets of a team. Can also manage tag members.

### Send Channel Message

Send a message to a channel in a Microsoft Team. Supports plain text and HTML content. Can also reply to an existing message thread by providing a parent message ID.

### Send Chat Message

Send a message in an existing chat. Supports plain text and HTML content. Can also create a new one-on-one or group chat and send a message in a single step.

### Update Team

Update properties of an existing Microsoft Team such as display name, description, visibility, or settings. Also supports archiving and unarchiving a team.

## Teams Bot Chat

Connect a Microsoft Teams bot (Azure Bot resource) with the **Teams Bot (Azure Bot)** connection to use the normalized chat actions and events. The connection takes the Microsoft App ID, a client secret, the directory (tenant) ID for single-tenant bots or for opening direct messages, and an optional Teams service URL (default `https://smba.trafficmanager.net/teams/`). Bot access tokens are requested with the client credentials flow for `https://api.botframework.com/.default` and renewed automatically.

Microsoft Graph user connections keep the tools above but cannot act as the bot, so they are not offered for chat. The bot app is exposed as one workspace (`msteams-bot:<app id>`) that contains every personal chat, group chat, and channel the bot can reach.

| Capability | Support | Notes |
| --- | --- | --- |
| Send message | Native | New posts, channel thread replies (`threadId`), and replies to an activity in chats. Text is sent as Teams Markdown; tables, charts, and cards are rendered as plain text and links. |
| Edit / delete message | Native | Bot's own messages only. |
| Typing indicator | Native | In chats and channel threads. |
| Conversation members | Native | Paged roster. |
| Open direct message | Native | Requires the tenant ID on the connection and the app installed for the user. |
| Download file | Native | Files users send in personal chats (OneDrive link) and inline images (bot-authenticated link). |
| Workspace list / get, current bot | Native | One synthetic workspace per bot. |
| Get conversation | Fallback | Derived from the conversation id format; Teams does not return names or channel visibility to bots. |
| Setup instructions | Native | Generates a Teams app manifest and Azure Bot steps without a connection. |
| Upload file | Not supported | Bots can only send files in personal chats after a per-file consent card; there is no direct upload. |
| Add / remove reactions | Not supported | Teams has no bot API for reactions. |
| Read, list, or search messages | Not supported | The Bot Connector has no message history API. |
| Ephemeral messages, slash command responses, group DMs, user lookup | Not supported | No bot API. |

### Events

Set the Azure Bot **Messaging endpoint** to the receive URL shown during event setup and enter the Microsoft App ID there. Every request must carry a Bot Connector token signed by a published Bot Framework key for this App ID; the issuer, audience, validity window, `serviceUrl` claim, and channel endorsement are checked before an event is accepted.

| Event | Teams activity |
| --- | --- |
| Message received | `message` |
| Mention received | `message` with a mention of the bot |
| Message updated | `messageUpdate` (edit or undelete) |
| Message deleted | `messageDelete` |
| Reaction added / removed | `messageReaction` (reactions to the bot's own messages only) |
| Member joined / left | `conversationUpdate` with `membersAdded` / `membersRemoved` (one event per member) |

By default bots in channels and group chats only receive messages that @mention them; the generated manifest requests resource-specific consent (`ChannelMessage.Read.Group`, `ChatMessage.Read.Chat`) so team and chat owners can allow all messages. Bots cannot post in private channels. Only the public Microsoft cloud (and GCC service URLs) is supported. See the [Bot Connector authentication](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication?view=azure-bot-service-4.0) and [conversation events](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events) references.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
