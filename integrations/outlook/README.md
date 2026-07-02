# <img src="https://provider-logos.metorial-cdn.com/Outlook%20SVG%20Icon.svg" height="20"> Outlook

Send, read, reply to, forward, and manage email messages in user mailboxes. Organize messages into folders, apply categories, flags, and importance levels. Manage file and item attachments. Create, update, delete, and respond to calendar events and meetings. Find available meeting times, manage attendees, handle recurrence, and work with shared or delegated calendars. Create, read, update, and delete contacts, organize them into contact folders, and manage contact photos. Manage tasks and task lists via Microsoft To Do, including due dates, reminders, recurrence, and checklist items. Subscribe to webhook notifications for changes to messages, calendar events, and contacts. Support for Focused Inbox, @-mentions, mail tips, send-on-behalf, and send-as capabilities.

## Tools

### Create Contact

Create a new contact in the authenticated user's contact book. Supports all standard contact fields including name, email, phone numbers, company info, and addresses. Optionally specify a contact folder.

### Create Draft

Create a draft email message in the Drafts folder. The draft can later be sent using the **Manage Email** tool or edited further. Useful for composing messages that need review before sending.

### Create Calendar Event

Create a new calendar event or meeting. Supports attendees, location, online meeting generation, recurrence patterns, reminders, and more. When attendees are specified, meeting invitations are automatically sent.

### Create Task

Create a new task in a Microsoft To Do task list. Supports title, body, due date, reminder, importance, status, categories, and recurrence.

### Find Meeting Times

Find available meeting time slots based on attendee availability and time constraints. Suggests optimal times when all or most attendees are free. Useful for scheduling meetings with multiple participants.

### Get Contact

Retrieve the full details of a specific contact by ID, including all email addresses, phone numbers, addresses, company information, and personal notes.

### Get Calendar Event

Retrieve the full details of a specific calendar event by its ID, including the complete body, attendees with response status, recurrence pattern, and online meeting information.

### Get Email

Retrieve the full details of a specific email message by its ID, including the complete body content, all recipients, and attachment metadata.

### List Calendars

List all calendars available to the authenticated user, including the default calendar and any additional calendars for work, family, etc. Returns calendar metadata and permission details.

### List Contacts

List contacts from the authenticated user's contact book. Supports filtering by folder, searching by keyword, and pagination. Returns contact summary information.

### List Calendar Events

List calendar events from the authenticated user's calendar. Supports filtering by date range (calendar view), specific calendar, and OData filters. When **startDateTime** and **endDateTime** are provided, uses the calendarView endpoint which expands recurring events into individual occurrences.

### List Mail Folders

List mail folders in the authenticated user's mailbox. Returns built-in folders (Inbox, Drafts, Sent Items, etc.) and custom folders with item counts. Optionally list child folders of a specific parent folder.

### List Emails

List email messages from the authenticated user's mailbox. Supports filtering by folder, searching by keyword, ordering, and pagination. Use OData filter syntax for advanced filtering (e.g., \

### List Task Lists

List all Microsoft To Do task lists for the authenticated user. Returns the list name, ID, ownership, and sharing status. Task lists organize tasks by category or purpose.

### List Tasks

List tasks from a specific Microsoft To Do task list. Supports filtering and pagination. Returns task summaries with status, due dates, and importance.

### Manage Contact

Update or delete an existing contact. Use **action** to specify the operation. For updates, only the provided fields will be changed.

### Manage Calendar Event

Update, respond to, or delete a calendar event. Use **action** to specify the operation: **update** to modify event properties, **respond** to accept/tentatively accept/decline the event, or **delete** to remove it.

### Manage Email

Perform actions on an existing email message: reply, reply all, forward, move to a folder, update properties (read status, importance, categories, flag), or delete. Use the **action** field to specify the operation.

### Manage Task

Update or delete a Microsoft To Do task. Use **action** to specify the operation. For updates, only the provided fields will be changed. Supports changing title, status, due date, importance, and more.

### Send Email

Send an email message from the authenticated user's mailbox. Supports recipients (to, cc, bcc), HTML or plain text body, importance level, reply-to addresses, and file attachments. The message is saved to Sent Items by default.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
