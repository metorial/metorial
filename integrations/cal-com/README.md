# <img src="https://provider-logos.metorial-cdn.com/cal-logo.png" height="20"> Cal Com

Create, manage, and cancel bookings, including recurring and seated events. Define event types with custom durations, locations, and scheduling rules for individuals and teams. Manage availability schedules and query available time slots. Connect external calendars (Google, Outlook, Apple) for conflict checking. Handle team and organization management with role-based access control. Set up routing forms to direct bookings to appropriate team members. Connect conferencing apps (Zoom, Google Meet) and Stripe for paid bookings. Register webhooks for real-time notifications on booking lifecycle events, payments, meeting activity, recording readiness, no-show detection, and form submissions. Manage out-of-office entries and automated workflows for reminders and notifications.

## Tools

### Create Booking

Create a new booking on Cal.com. Supports regular, recurring, and instant bookings depending on the event type. Provide the event type ID or slug+username combination, along with the start time and attendee details.

### Create Event Type

Create a new event type that defines what can be booked. Configure the title, duration, location, scheduling rules, and custom booking fields.

### Delete Event Type

Permanently delete an event type. Only the event type owner can perform this action. This cannot be undone.

### Get Available Slots

Query available booking time slots for a given event type within a date range. Slots can be looked up by event type ID, or by event type slug and username combination. Useful for finding open times before creating a booking.

### Get Booking

Retrieve detailed information about a specific booking by its UID. For recurring bookings, passing the recurring booking UID returns all recurrences.

### Get Busy Times

Retrieve busy time windows across all connected calendars for a date range. Useful for understanding availability conflicts before scheduling.

### Get Profile

Retrieve the authenticated user's profile information including name, email, time zone, and other account details.

### List Bookings

Retrieve a list of bookings for the authenticated user. Supports filtering by status, attendee email/name, event type, date range, and more. Returns booking details including attendees, event type, timing, and status.

### List Calendars

Retrieve all connected calendars for the authenticated user. Shows calendar connections used for conflict checking and booking destinations, including Google, Outlook, Apple, and ICS feeds.

### List Event Types

Retrieve all event types for the authenticated user. Returns event type details including title, slug, duration, locations, and scheduling configuration.

### Manage Booking

Perform lifecycle actions on an existing booking: cancel, reschedule, confirm, decline, mark as no-show, reassign to another host, or add guests. Select the desired action and provide the required parameters.

### Manage Schedule

Create, update, or delete an availability schedule. Schedules define when a user can be booked. Each user can have multiple schedules with one set as default. Use action "create" to make a new schedule, "update" to modify an existing one, "delete" to remove one, or "list" to view all schedules.

### Update Event Type

Update an existing event type's configuration. Only the owner can update an event type. Any provided fields will be updated; omitted fields remain unchanged.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
