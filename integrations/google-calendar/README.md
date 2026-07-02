# <img src="https://provider-logos.metorial-cdn.com/google-calendar.svg" height="20"> Google Calendar

Create, read, update, and delete calendar events and calendars. Manage attendees, recurring events, and reminders. Check free/busy availability for scheduling. Share calendars and control access permissions. Create events from natural language text with quick add. Manage special event types like focus time, out of office, and working location. Subscribe to or remove calendars from a user's calendar list. Sync calendar changes incrementally and receive webhook notifications for event, calendar list, ACL, and settings changes.

## Tools

### Create Event

Create a new event on a Google Calendar. Supports timed events, all-day events, recurring events, attendees, conferencing (Google Meet), reminders, and more. Use **"primary"** as the calendarId to create events on the user's primary calendar.

### Delete Event

Permanently delete an event from a Google Calendar. For recurring events, this deletes the entire series unless a specific instance ID is provided.

### Find Free/Busy

Query the free/busy availability for one or more calendars over a given time range. Returns busy time slots without exposing event details. Useful for finding open meeting times and checking availability.

### Get Colors

Retrieve the available calendar and event color definitions used in Google Calendar. Returns color IDs with their background and foreground hex values. Use these IDs when setting colors on events or calendars.

### Get Event

Retrieve the full details of a specific event by its ID, including attendees, recurrence, conference data, and all metadata.

### List Calendars

List all calendars on the user's calendar list, including their primary calendar, subscribed calendars, and shared calendars. Returns calendar metadata including access role, color, and visibility settings.

### List Events

List events from a Google Calendar with flexible filtering options. Supports time range filtering, text search, pagination, and sorting. Use **"primary"** as the calendarId to list events from the user's primary calendar.

### Manage Calendar

Create, update, or delete a secondary calendar. Can also subscribe to (add) or unsubscribe from (remove) calendars on the user's calendar list. Use the **action** field to select the operation.

### Manage Sharing

Manage access control (sharing permissions) on a calendar. List current permissions, grant access to users/groups, update roles, or revoke access.

### Quick Add Event

Create an event using natural language text, just like the "Quick Add" feature in the Google Calendar UI. Google parses the text to extract the event title, date, time, and location automatically.

### Update Event

Update an existing Google Calendar event. Only the provided fields will be modified; all other fields remain unchanged. Can also be used to **move an event** to a different calendar by specifying destinationCalendarId.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
