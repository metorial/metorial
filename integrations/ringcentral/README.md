# <img src="https://provider-logos.metorial-cdn.com/ring-central.svg" height="20"> Ringcentral

Send and receive SMS, MMS, and fax messages from RingCentral phone numbers. Place and manage voice calls with controls like hold, transfer, park, and conference. Create and schedule video meetings and webinars, manage meeting recordings and registrations. Post messages, adaptive cards, tasks, and files into team messaging chats and channels. Access call logs and analytics with aggregate and timeline-based reporting. Manage account users, extensions, devices, phone numbers, and presence status. Connect with customers across social channels including Facebook, WhatsApp, Instagram, and X (Twitter). Leverage AI-powered speech-to-text transcription, conversation summaries, and interaction analytics. Subscribe to real-time event notifications via webhooks or WebSockets for calls, messages, presence changes, and more.

## Tools

### Get Presence

Retrieve a user's presence and availability status in RingCentral. Returns the user's current status, do-not-disturb setting, presence, and telephony state. Omit extensionId to get the authenticated user's presence.

### List Call Logs

Retrieves call log records from RingCentral. Supports both extension-level and account-level call logs with filtering by date range, call type, and direction.

### List Extensions

Lists and searches RingCentral account extensions (users, departments, IVR menus, etc.) with optional filtering by extension type and status. Returns paginated results.

### List Messages

List messages from the RingCentral message store including SMS, fax, and voicemail. Supports filtering by message type, direction, date range, and pagination.

### List Phone Numbers

List phone numbers assigned to a RingCentral extension. Returns all phone numbers associated with the specified extension, or the current user's extension if no extension ID is provided.

### Make Call

Place an outbound phone call using RingCentral's RingOut API. This initiates a two-leg call: first ringing the caller's phone (fromNumber), then connecting to the destination (toNumber) once answered.

### Manage Call

Manage an active call via RingCentral's Call Control API. Supports placing a call on hold, resuming a held call, transferring a call to another number, or forwarding a call to another number.

### Manage Meeting

Create, retrieve, update, delete, or list RingCentral video meetings. Combine multiple meeting management operations in a single tool — schedule a new meeting, update its settings, fetch details, or clean up old meetings.

### Send Fax

Send a fax to one or more recipients via RingCentral. Supports custom resolution, cover page text, and a file attachment encoded as base64.

### Send SMS

Send an SMS or MMS message via RingCentral. Supports person-to-person (P2P) messaging for individual conversations and application-to-person (A2P) high-volume batch messaging for bulk notifications or campaigns.

### Send Team Message

Post a message to a RingCentral team messaging chat. Supports plain text and optional attachments such as cards, events, and notes.

### Update Presence

Updates the presence and availability status for a RingCentral user. Supports changing the user status (Available, Busy, Offline) and Do Not Disturb mode (TakeAllCalls, DoNotAcceptAnyCalls, DoNotAcceptDepartmentCalls, TakeDepartmentCallsOnly).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
