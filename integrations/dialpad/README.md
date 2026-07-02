# <img src="https://provider-logos.metorial-cdn.com/dialpad.png" height="20"> Dialpad

Manage business communications including voice calls, SMS messaging, video meetings, and contact center operations. Initiate and control calls, send SMS messages, manage users and contacts, configure call centers with agent duty status and skill levels, set up call routing with IVR menus, retrieve AI-generated call transcripts and recaps, send faxes, manage phone number assignments, subscribe to real-time webhook events for calls and messages, run analytics reports, and administer company settings including access control policies and blocked numbers.

## Tools

### Get Company Info

Retrieve information about your Dialpad company, including name, settings, and plan details.

### Get User

Retrieve detailed information about a specific Dialpad user by their ID. Returns profile, status, contact info, and settings.

### Initiate Call

Initiate an outbound call from a Dialpad user's application. The target user must have at least one active autocallable device (web or desktop Dialpad app, or CTI).

### List Call Centers

List call centers for a specific office in your Dialpad account. Returns call center details including name, state, and metadata.

### List Calls

List calls in your Dialpad account. Filter by time range and target (user, call center, department, or office). Requires the **calls:list** scope.

### List Contacts

List shared and local contacts in your Dialpad account with cursor-based pagination.

### List Offices

List all offices accessible with your API key. Returns office details including name, location, and associated departments and call centers.

### List Users

List users in your Dialpad company. Supports filtering by email or state and cursor-based pagination.

### Manage Blocked Number

List, add, or remove blocked phone numbers at the company level. Blocked numbers are prevented from calling into your Dialpad organization.

### Manage Call Center

Create, update, or delete a Dialpad call center. Also supports managing operators — adding or removing agents from a call center.

### Manage Call

Perform actions on an active Dialpad call: hang up, transfer to another number or user, or toggle call recording.

### Manage Contact

Create, update, upsert, or delete a Dialpad contact. The **upsert** action uses an external unique identifier to create-or-update, which is useful for syncing contacts from external systems.

### Manage Phone Number

List, assign, or unassign Dialpad phone numbers. Numbers can be assigned to users, offices, rooms, or call routers.

### Manage User

Create, update, or delete a Dialpad user. Use this to provision new users, modify user settings (name, DND, office), or remove users from the company.

### Send SMS

Send an SMS message to one or more phone numbers through Dialpad. Optionally specify a sender user or group.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
