# <img src="https://provider-logos.metorial-cdn.com/microsoft-teams.svg" height="20"> Microsoft Teams

Send, read, update, and delete messages in channels and chats. Create and manage teams, channels, and memberships. Schedule and manage online meetings, access call recordings and transcripts. Monitor user presence status in real time. Manage shifts, schedules, and time-off requests for frontline workers. Install and configure apps and tabs within teams. Send activity feed notifications to users. Subscribe to change notifications (webhooks) for messages, chats, teams, channels, memberships, presence, and meeting events. Create and manage tags for @mentioning user groups. Generate usage reports and import historical message data from other platforms.

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

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
