# <img src="https://provider-logos.metorial-cdn.com/calendly.svg" height="20"> Calendly

List, retrieve, and cancel scheduled events. Book meetings programmatically on behalf of invitees using available time slots. Retrieve event types and their configurations. Query user availability, available time slots, busy times, and availability schedules. Create single-use scheduling links with optional overrides. List and manage invitees, mark no-shows, and access custom question responses and UTM tracking data. Manage organization memberships, invite or remove users. Retrieve routing form configurations and submissions. Subscribe to webhooks for new bookings, cancellations, and routing form submissions.

## Tools

### Cancel Event

Cancel a scheduled Calendly event. Optionally provide a cancellation reason. This cancels the entire event, not individual invitees in a group event.

### Check Availability

Check available time slots for a specific event type, retrieve a user's busy times, or list availability schedules. Combine these to understand when a user can be booked.

### Create Scheduling Link

Create a single-use scheduling link for a specific event type. The generated link can be shared with an invitee to book one meeting. Single-use links expire after 90 days if unused.

### Create Event Invitee

Book a Calendly meeting by creating an invitee for an event type at an available start time. Use check_availability first and pass one of the returned start times.

### Get Event Details

Retrieve detailed information about a specific scheduled event, including its invitees. Returns the event details along with the list of invitees and their responses to custom questions.

### Get Event Invitee

Retrieve detailed invitee information for a scheduled event, including contact details, answers, no-show status, and cancellation/reschedule links.

### Get Event Type

Retrieve detailed Calendly event type configuration, including scheduling URL, duration, location metadata, and custom questions.

### Get User

Retrieve a Calendly user's profile information. If no userUri is provided, returns the currently authenticated user's profile with their organization URI and scheduling URL.

### List Event Types

List event type templates (e.g., "30-min Demo", "Onboarding Call") for a user or organization. Event types define the meeting configurations including duration, location, and custom questions.

### List Scheduled Events

List scheduled events (meetings) for a user or organization. Filter by status, date range, or invitee email. Results are paginated. Use **userUri** or **organizationUri** (at least one required) to scope the results. The authenticated user's URI and organization URI are available from the auth context.

### List Event Invitees

List invitees for a scheduled event. Returns contact information, responses to custom questions, UTM tracking data, and cancellation/reschedule URLs. Filter by status or email.

### List Organization Members

List all members of a Calendly organization. Returns member profiles with their roles. Optionally filter by email address. Requires admin/owner role for organization-level access.

### List Routing Forms

List routing forms and optionally their submissions for an organization. Routing forms direct visitors to specific people or destinations based on qualifying criteria like industry, company size, and interests.

### Mark Invitee No-Show

Mark or unmark an invitee as a no-show for a scheduled event. Use this to track attendance after a meeting time has passed.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
