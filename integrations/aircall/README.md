# <img src="https://provider-logos.metorial-cdn.com/aircall.png" height="20"> Aircall

Manage cloud-based business phone system including calls, SMS/MMS messaging, contacts, users, teams, and phone numbers. Retrieve call recordings, notes, and metadata. Transfer calls to users, teams, or external numbers. Create and manage contacts with phone numbers and emails. Send SMS/MMS messages from Aircall numbers. Display contextual insight cards during live calls. Manage tags on calls, configure webhooks for real-time call, message, contact, and user events. Automate outbound dialing with Power Dialer. Monitor user availability and initiate outbound calls on behalf of agents.

## Tools

### Create Insight Card

Display contextual information to agents during an ongoing call. Push custom data such as customer details, CRM links, or account information into the agent's call view. Cards are only visible during the active call and are not stored afterward.

### Get Call

Retrieve detailed information about a specific call including participants, recording URLs, comments, tags, transfer details, and IVR selections.

### Get User

Retrieve detailed information about a specific user including their availability, assigned numbers, timezone, and role details. Optionally check the user's real-time availability status.

### List Calls

List and search calls in Aircall. Filter by direction, phone number, user, contact, tags, and time range. Returns call metadata including direction, status, duration, participants, and associated recordings.

### List Contacts

List and search contacts in Aircall. Optionally filter by phone number or email address. Returns contact details including phone numbers, emails, and company information.

### List Numbers

List all phone numbers associated with the Aircall account. Returns number details including country, timezone, open/closed status, and live recording settings.

### List Tags

List all tags available in the Aircall account. Tags are used to categorize and label calls. Use the returned tag IDs to apply tags to calls via the Manage Call tool.

### List Users

List all users in the Aircall account with their availability status, assigned numbers, and role information. Supports pagination and time-based filtering.

### Manage Call

Perform actions on a call: transfer to a user/team/number, add comments or tags, archive/unarchive, or control recording (pause/resume/delete). Combine multiple actions in a single operation.

### Manage Contact

Create, update, or delete a contact in Aircall. When creating, provide at least first name, last name, and one phone number. When updating, specify only the fields to change. Also supports adding, updating, or removing phone numbers and emails on existing contacts.

### Manage Team

Create or delete teams, and add or remove users from teams. Teams are used in call distribution for numbers. Retrieve team details with user membership.

### Manage User

Create, update, or delete a user in Aircall. When creating, provide email, first name, and last name. When updating, specify only the fields to change. Supports setting availability, roles, and wrap-up time.

### Send SMS/MMS

Send an SMS or MMS message from an Aircall phone number. The number must be pre-configured for API-based messaging. Messages sent via API are **not** recorded or displayed in the Aircall platform.

### Start Outbound Call

Initiate an outbound call on behalf of a user. The user must be available, not currently on a call, and associated with the specified number. Works only on desktop app.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
