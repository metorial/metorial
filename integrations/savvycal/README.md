# <img src="https://provider-logos.metorial-cdn.com/savvycal.png" height="20"> Savvycal

Discover available booking slots, create and cancel events, and manage scheduling links in SavvyCal. Retrieve event details, custom fields, workflow listings, the current user, and supported time zones.

## Tools

### Cancel Event

Cancel an existing SavvyCal event. Optionally provide a cancellation reason that will be included in notifications.

### Create Event

Schedule a new event through a SavvyCal scheduling link. The time slot must match the link's available slots. Provide attendee details and optionally custom field values and metadata.

### Get Event

Fetch detailed information about a specific SavvyCal event by its ID. Returns full event details including attendees, conferencing, scheduling link info, payment details, and reschedule/cancellation history.

### Get Current User

Retrieve information about the currently authenticated SavvyCal user. Returns profile details such as name, email, and avatar.

### List Events

List scheduled events from SavvyCal. Supports filtering by event state and pagination via cursor-based navigation. Returns event details including attendees, conferencing info, and metadata.

### List Available Link Slots

List available start and end times, meeting durations, and availability ranks for a scheduling link. Use these slots when creating an event.

### List Scheduling Links

List all scheduling links in the SavvyCal account. Returns link configuration including name, slug, durations, custom fields, and state. Supports cursor-based pagination.

### List Time Zones

List all supported time zones in SavvyCal. Returns IANA time zone identifiers with their abbreviations and UTC offsets. Useful for creating events or scheduling links with the correct time zone.

### List Workflows

List automated workflows configured in SavvyCal. Workflows attach actions (like email reminders, CRM updates) to scheduling links. Supports cursor-based pagination.

### Manage Scheduling Link

Create, update, or delete a SavvyCal scheduling link. Use the **action** field to specify the operation: - **create**: Create a new personal scheduling link - **update**: Update an existing link's properties - **delete**: Delete a scheduling link - **duplicate**: Duplicate an existing link

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
