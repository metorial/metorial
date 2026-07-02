# <img src="https://provider-logos.metorial-cdn.com/zoom.svg" height="20"> Zoom

Create, schedule, and manage video meetings and webinars. Manage users, roles, and account settings. Access and download cloud recordings and transcripts. Send and manage chat messages and channels. Handle Zoom Phone call logs, voicemails, and SMS. Manage meeting registrants, polls, and breakout rooms. Retrieve usage reports, meeting participant reports, and dashboard analytics. Configure Zoom Rooms and contact center settings. Receive real-time webhook notifications for meeting, webinar, recording, user, phone, and chat events.

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

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
