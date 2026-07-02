# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Google Contacts

Create, read, update, and delete contacts with rich data fields including names, emails, phone numbers, addresses, organizations, birthdays, and notes. Search contacts by name, email, or phone number. Manage contact groups (labels) by creating, updating, and listing groups and their members. Access "Other contacts" automatically saved by Google. Browse Google Workspace directory profiles. Retrieve authenticated user profile information and public Google profile data. Manage contact photos.

## Tools

### Copy Other Contact to My Contacts

Copies an "Other contact" to the user's "My Contacts" group, making it a regular editable contact. Requires both the \

### Create Contact

Creates a new contact in the authenticated user's Google Contacts. Provide any combination of names, emails, phone numbers, addresses, organizations, and other contact fields.

### Delete Contact

Permanently deletes a contact from the authenticated user's Google Contacts. This action cannot be undone.

### Get Contact Group

Retrieves details about a specific contact group including its name, type, member count, and member resource names. Use this to inspect group membership.

### Get Contact

Retrieves detailed information about a specific contact by their resource name. Use \

### List Contact Groups

Lists all contact groups (labels) owned by the authenticated user, including both user-defined and system groups (like "My Contacts" and "Starred").

### List Contacts

Lists the authenticated user's contacts with pagination support. Returns contacts sorted by the specified order. Use the \

### List Other Contacts

Lists contacts automatically saved in "Other contacts" by Google from interactions. These are read-only and only include names, email addresses, and phone numbers. Requires the \

### Create Contact Group

Creates a new contact group (label) for the authenticated user. Group names must be unique among the user's contact groups. Optionally attach client-specific key-value data.

### Modify Group Members

Add or remove contacts from a contact group. You can add contacts to \

### Search Contacts

Searches the authenticated user's contacts by name, email address, phone number, or other fields. Returns matching contacts ranked by relevance.

### Search Directory

Searches the Google Workspace domain directory for profiles and contacts matching a query. Only available for Google Workspace users with the \

### Search Other Contacts

Searches "Other contacts" by name, email, or phone number. Other contacts are automatically saved by Google from interactions and are read-only. Requires the \

### Update Contact

Updates an existing contact's data. You must provide the contact's resource name and etag (obtained from a previous get/list/search). Only the fields you include will be updated; omitted fields remain unchanged.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
