# <img src="https://provider-logos.metorial-cdn.com/drift.png" height="20"> Drift

Manage contacts, conversations, and messaging for conversational marketing and sales. Create, retrieve, update, and delete contacts with custom attributes. Start conversations, send bot messages, retrieve message history, and export transcripts. Manage accounts for account-based marketing and retrieve active playbooks. Schedule and track meetings booked by visitors. List teams and manage user availability. Handle GDPR data retrieval and deletion requests. Provision users via SCIM 2.0. Receive real-time webhooks for new conversations, messages, contact updates, meeting bookings, playbook goals, and user availability changes.

## Tools

### Create Contact

Create a new contact in Drift. Requires at least an email address. You can also set custom attributes and an external ID for integration with other systems.

### Create Conversation

Start a new conversation in Drift with a contact. Creates a conversation using an email address and an initial message. If no contact exists with the given email, one will be created.

### Delete Contact

Permanently delete a contact from Drift by their contact ID.

### Get Booked Meetings

Retrieve booked meetings from Drift within a time range. Returns meetings across the organization with scheduling details, agent info, and conference details.

### Get Contact

Retrieve a Drift contact by their ID or email address. Returns contact attributes including name, email, phone, and any custom attributes.

### Get Conversation

Retrieve detailed information about a specific Drift conversation, including participants, tags, status, and related playbook. Optionally include the message transcript.

### List Conversations

List conversations in Drift with optional status filtering and pagination. Returns conversations sorted by most recently updated.

### List Playbooks

List active playbooks in Drift. Playbooks are automated message workflows and campaigns that proactively engage site visitors. This is read-only — playbooks can only be edited in the Drift UI.

### List Teams

List all teams in the Drift organization, or list teams for a specific user. Teams organize agents for routing and assignment purposes.

### List Users

List all users (agents) in the Drift organization. Returns the full list of users with their availability, role, and contact information. Can optionally retrieve a single user by ID.

### Manage Account

Create, retrieve, update, or delete an account in Drift. Accounts are used for personal account tracking and ABM (account-based marketing) targeting in playbooks.

### Send Message

Send a message in an existing Drift conversation. Can send chat messages visible to the contact or private notes visible only to agents. Supports interactive buttons.

### Update Contact

Update an existing Drift contact's attributes. Supports updating standard fields like name, email, phone, as well as any custom attributes.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
