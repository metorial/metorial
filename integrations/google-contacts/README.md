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

Lists contacts automatically saved in "Other contacts" by Google from interactions. These are read-only and only include names, email addresses, and phone numbers. Requires the `contacts.other.readonly` scope.

### Create Contact Group

Creates a new contact group (label) for the authenticated user. Group names must be unique among the user's contact groups. Optionally attach client-specific key-value data.

### Modify Group Members

Add or remove contacts from a contact group. You can add contacts to \

### Search Contacts

Searches the authenticated user's contacts by name, email address, phone number, or other fields. Returns matching contacts ranked by relevance.

### Search Directory

Searches the Google Workspace domain directory for profiles and contacts matching a query. Only available for Google Workspace users with the \

### Search Other Contacts

Searches "Other contacts" by name, email, or phone number using prefix matching. Other contacts are automatically saved by Google from interactions and are read-only. Sends a cache warmup request before querying; very recent interactions may take a moment to appear. Returns at most 30 results with no pagination. Requires the `contacts.other.readonly` scope.

### Update Contact

Updates an existing contact's data. You must provide the contact's resource name and etag (obtained from a previous get/list/search). Only the fields you include will be updated; omitted fields remain unchanged.

### Get My Profile

Retrieves the authenticated Google user's People profile. The fields returned depend on the granted scopes: `userinfo.email` provides the primary email address, `userinfo.profile` provides available name and photo details, and contacts grants retain the full profile request, including organizations, phone numbers, and biographies.

### Manage Contact Photo

Updates or deletes the photo for a contact in the authenticated user's Google Contacts.

### Batch Modify Contacts

Creates, updates, deletes, or gets multiple Google contacts in one People API request. Create, update, and get accept up to 200 contacts; delete accepts up to 500.

## Events

Enable callbacks on an OAuth connection with `contacts` or `contacts.readonly`
access to receive `contact_changed` snapshots. API keys cannot receive contact
events. Reconnect older connections whose granted scopes are unavailable.

Contacts are checked every 15 minutes. Each check reads every contact changed since
one hour before the point the previous check reached. Each event contains
`accountId`, the normalized `contact` (resource name, names, emails, phone numbers,
and other available fields), and its `source` (`CONTACT` ID, original update time,
and optional etag). The account, contact-source ID, original timestamp, and source
etag identify a revision, so repeated observations reuse the same event ID.

This is a snapshot feed: newly created contacts are included, but creation
and edits are not distinguished, intermediate edits collapse into the latest snapshot,
and deletions are not reported. The first check can include contacts changed during
the preceding hour. After an interruption of any length, the next check resumes from
the point the last complete check reached and delivers a snapshot of every contact
changed since then. Revisions already reported inside that hour are remembered and
skipped, so an interruption of any length does not report a revision twice. Contacts
without a usable contact-source timestamp are skipped with a warning, and so is a
contact that Google returns in an unexpected form; neither holds up the others.

One check reads at most 10 pages of 1000 contacts and stops after 30 seconds. When
more contacts changed than that, the newest snapshots are delivered first and the following checks continue with
the older ones before the feed moves on; nothing is dropped. If Google no longer
accepts the saved position, one check rereads up to 30 pages from the newest change,
which covers a full Google Contacts account.

See the [event output example](./docs/SPEC.md#events), Google's
[connections list contract](https://developers.google.com/people/api/rest/v1/people.connections/list),
and [contact source metadata](https://developers.google.com/people/api/rest/v1/people#Source).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
