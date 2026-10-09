# <img src="https://provider-logos.metorial-cdn.com/zoom.svg" height="20"> Zoom

Create, schedule, and manage video meetings and webinars. Manage users, roles, and account settings. Access and download cloud recordings and transcripts. Send and manage chat messages and channels. Handle Zoom Phone call logs, voicemails, and SMS. Manage meeting registrants, polls, and breakout rooms. Retrieve usage reports, meeting participant reports, and dashboard analytics. Configure Zoom Rooms and contact center settings.

## Tools

### Create Meeting

Schedule a new Zoom meeting for a user. Supports instant meetings, scheduled meetings, and recurring meetings with full configuration of settings like waiting rooms, breakout rooms, recording, passwords, and more.

### Create Webinar

Schedule a new Zoom webinar. Requires the Zoom Webinar add-on. Supports configuring registration, panelists, Q&A, and recording settings.

### Delete Webinar

Delete a scheduled Zoom webinar.

### Delete Meeting

Delete a scheduled Zoom meeting. This permanently removes the meeting and cannot be undone.

### Delete Recording

Delete cloud recordings for a meeting. Can delete all recordings for a meeting or a specific recording file. Supports moving to trash or permanent deletion.

### Get Meeting Participants

Retrieve the participant report for a past meeting. Returns participant names, join/leave times, duration, and email addresses. Uses the Reports API and requires Business or higher plan.

### Get Meeting Recordings

Retrieve all cloud recording files for a specific meeting, including video, audio, chat, and transcript files with download URLs.

### Get Meeting Report

Retrieve a report for a past meeting including duration, participant count, and meeting details. Also fetches participant-level details with join/leave times.

### Get Meeting

Retrieve detailed information about a specific Zoom meeting by its ID. Returns meeting configuration, settings, join URLs, and scheduling details.

### Get Meeting Invitation

Retrieve the formatted invitation text and SIP dial-in links for a Zoom meeting.

### Get User

Retrieve detailed profile information for a specific Zoom user including their settings, permissions, and account details.

### Get User Settings

Retrieve a Zoom user's meeting, recording, telephony, and feature settings.

### Get Webinar

Retrieve detailed information about a specific Zoom webinar by its ID.

### List Chat Channels

List Zoom Team Chat channels the user belongs to. Returns channel names, IDs, and types for use with sending messages or managing channel membership.

### List Meetings

List all meetings for a Zoom user. Supports filtering by meeting type (scheduled, live, upcoming) and pagination.

### List Recordings

List cloud recordings for a Zoom user within a date range. Returns recording metadata including download URLs, file types, and sizes. Useful for finding specific meeting recordings or batch processing.

### List Users

List users in the Zoom account. Supports filtering by status (active, inactive, pending) and pagination. Requires admin-level scopes for listing all users.

### List Webinars

List all webinars scheduled by a Zoom user. Requires the Webinar add-on. Supports pagination.

### Manage Meeting Registrants

List existing registrants or add a new registrant to a Zoom meeting. When adding a registrant, provide their email and name. When listing, supports filtering by status and pagination.

### Manage Meeting Polls

List, create, retrieve, update, or delete polls for a Zoom meeting.

### Manage Chat Messages

List, retrieve, update, or delete Zoom Team Chat messages in a channel or direct conversation.

### Send Chat Message

Send a Zoom Team Chat message to a channel or directly to a contact. Provide either a channel ID or contact email as the recipient.

### Update Meeting

Update an existing Zoom meeting's topic, schedule, duration, settings, or other properties. Only provided fields will be updated.

### Update Webinar

Update an existing Zoom webinar's topic, schedule, duration, agenda, or settings.

## Team Chat Chatbot

Connect with the **Team Chat Chatbot** auth method to let this integration act as a Zoom Team Chat chatbot (a Zoom General app with **Zoom Chat Subscription** enabled). It needs the app's Client ID and Client Secret, the Bot JID, the Zoom Account ID where the chatbot is installed, and, for user-managed apps only, the JID of the authorizing user. A chatbot token is requested with the client credentials grant and renewed hourly. The OAuth and Server-to-Server OAuth methods act as Zoom users; the tools above use them, and the chatbot actions below are available only with the chatbot method.

Destinations are JIDs: a user JID (`USER_ID@xmpp.zoom.us`) for the chatbot's direct chat with that user, or a channel JID (`CHANNEL_ID@conference.xmpp.zoom.us`). The workspace is the Zoom account.

| Capability | Support | Notes |
| --- | --- | --- |
| Send message | Native | `POST /im/chat/messages`, Zoom chatbot markdown, fields and sections |
| Reply in thread | Native | `reply_to` with a Zoom message ID |
| Edit / delete message | Native | Chatbot messages only, by message ID |
| Workspaces | Native | The configured Zoom account |
| Authenticated user | Native | The chatbot (Bot JID) and its account |
| Channel details | Documented fallback | Derived from the JID; Zoom supplies channel names only on inbound requests |
| Setup instructions | Native | Marketplace chatbot app, slash command, Bot Endpoint URL |
| Message received | Native | A `bot_notification` from the chatbot's direct chat with a user |
| Command invoked | Native | A `bot_notification` from a channel, where Zoom reaches the chatbot only through its slash command, with the configured command name and the text after it. Each request produces exactly one event |

Not supported:

- **Reactions, typing indicators, file upload and download, message read, history, search, channel list, members, user lookup, DMs on demand:** the chatbot API has no endpoints for them with the chatbot token.
- **Ephemeral messages:** Zoom's `visible_to_user` field exists for admin-managed apps only and is not used yet; ephemeral sends are rejected.
- **Threaded replies to inbound requests:** `bot_notification` carries no Zoom message ID, so inbound messages get a stable `bot_notification:` ID. Replying to one sends the message unthreaded into the same conversation.
- **@mentions (`team_chat.app_mention`):** the payload has a channel ID instead of a JID and no Bot JID to route by; not delivered.
- **Edits, deletions, and member changes:** Zoom does not send them to chatbots. `bot_installed` is acknowledged without an event.
- **Tables and charts** are sent as monospace text; links and images must be http(s) URLs; **file attachments** are rejected.
- **External users:** `bot_notification` reports the sender's account ID. A request from a user of another Zoom account (for example in a shared channel) is routed by that account and may not reach this connection; this has not been verified live.

### Receiving chatbot requests

Chatbot requests arrive at the **Bot Endpoint URL** of the Marketplace app. Create the endpoint, then enter the app's **Secret Token**, the **Bot JID**, and the **slash command** before saving the Bot Endpoint URL in Zoom, because Zoom validates it (`endpoint.url_validation`) on save. Every request is verified with the `x-zm-signature` HMAC and a 5 minute timestamp window, and is routed to the connection whose Bot JID and account match. Each event is deduplicated by Zoom's `triggerId`, or by bot, destination, user, and timestamp when `triggerId` is absent.

References: [Create a chatbot](https://developers.zoom.us/docs/chat/create-chatbot/), [Chatbot authorization](https://developers.zoom.us/docs/chat/installation-and-authentication/), [Send, edit, and delete messages](https://developers.zoom.us/docs/chat/send-edit-and-delete-messages/), [Chatbot events](https://developers.zoom.us/docs/api/chatbot/events/), [Webhook verification](https://developers.zoom.us/docs/api/webhooks/#verify-webhook-events).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
