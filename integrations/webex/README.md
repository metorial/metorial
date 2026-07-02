# <img src="https://provider-logos.metorial-cdn.com/webex.png" height="20"> Cisco Webex

Send, read, and manage messages in spaces (rooms) with support for text, Markdown, file attachments, and interactive Adaptive Cards. Create and manage spaces, teams, and space memberships. Schedule, update, and delete meetings, manage meeting invitees, polls, Q&A, and chat. Access and manage meeting recordings and transcripts. Query and manage people, organizations, licenses, and roles. Control Webex Calling features including call forwarding, voicemail, call queues, hunt groups, and auto attendants. Manage and configure Webex RoomOS devices and workspaces. Register webhooks for real-time notifications on messages, rooms, memberships, meetings, participants, recordings, transcripts, and telephony events. Perform administrative actions including audit events, hybrid services, compliance, and organization-wide management.

## Tools

### Delete Message

Permanently delete a message from a Webex space. The message must belong to the authenticated user, or the user must be a moderator of the space.

### Edit Message

Edit an existing message in a Webex space. Only the text or markdown content can be updated. Messages with file attachments or Adaptive Cards cannot be edited. A message can be edited up to 10 times.

### Get Meeting Details

Retrieve full details of a specific Webex meeting by its ID, including join link, host info, scheduling details, and current state.

### Get Message

Retrieve the full details of a specific message by its ID, including text content, attachments, mentioned people, and metadata.

### Get Space Details

Retrieve full details of a specific Webex space by its ID, including title, type, moderation status, team association, and activity timestamps.

### List Meetings

List scheduled Webex meetings. Filter by meeting number, state, date range, or host email. Returns meeting metadata, join links, and scheduling details.

### List Members

List members of a Webex space. Filter by room, person ID, or email. Returns membership details including moderator status and display names.

### List Messages

List messages in a Webex space or direct conversation. Use **roomId** to list messages in a specific space, or use **personId**/**personEmail** to list direct messages with a specific person.

### List People

Search and list people in the Webex organization directory. Filter by email, display name, or person ID. Returns profile information including name, email, status, and organization.

### List Recordings

List meeting recordings. Filter by meeting ID, date range, host email, or site URL. Returns recording metadata including playback and download URLs.

### List Spaces

List Webex spaces (rooms) the authenticated user belongs to. Filter by team, type (direct or group), and sort by ID, last activity, or creation date.

### Create Meeting

Schedule a new Webex meeting with a title, time, and optional settings like agenda, recurrence, auto-recording, and invitees. Returns the meeting details including the join link.

### Add Member to Space

Add a person to a Webex space by their person ID or email address. Optionally grant moderator privileges. You must be a member of the space to add others.

### Create Space

Create a new Webex space (room). The authenticated user is automatically added as a member. Optionally associate the space with a team, enable moderation, or make it public within the organization.

### List Teams

List all teams the authenticated user belongs to.

### Send Message

Send a message to a Webex space or directly to a person. Supports plain text, Markdown formatting, file attachments via URL, and Adaptive Cards. Use **roomId** to send to a specific space, or **toPersonId**/**toPersonEmail** to send a direct 1:1 message. Set **parentId** to reply in a thread.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
