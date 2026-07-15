# Slates Specification for Google Contacts

## Overview

Google Contacts is a contact management service by Google, accessible via the People API (which replaced the legacy Contacts API in January 2022). The People API allows reading and managing the authenticated user's contacts, including private contacts and "Other contacts", as well as accessing profile information for authenticated users and their contacts, including public Google profile data and Google Workspace domain profile data.

## Authentication

Google Contacts (People API) supports **OAuth 2.0** as the primary authentication method for accessing private user data, and **API keys** for accessing public profile data only.

### OAuth 2.0

Register your application using the Google API Console. Google provides a client ID and client secret. You must activate the People API in the Google API Console. When the application needs access to user data, it asks Google for a particular scope of access. Google displays a consent screen to the user. If the user approves, Google provides a short-lived access token.

- **Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
- **Token endpoint:** `https://oauth2.googleapis.com/token`
- **Base API URL:** `https://people.googleapis.com/v1/`

#### Scopes

| Scope                                                     | Description                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/contacts`                | See, edit, download, and permanently delete your contacts.                          |
| `https://www.googleapis.com/auth/contacts.readonly`       | See and download your contacts.                                                     |
| `https://www.googleapis.com/auth/contacts.other.readonly` | See and download contact info automatically saved in "Other contacts".              |
| `https://www.googleapis.com/auth/directory.readonly`      | See and download your organization's Google Workspace directory.                    |
| `https://www.googleapis.com/auth/userinfo.profile`        | See your personal info, including any personal info you've made publicly available. |

Apps that request access to scopes categorized as sensitive or restricted must complete Google's OAuth app verification before being granted access.

### API Keys

A request that does not provide an OAuth 2.0 token must send an API key. The key identifies your project and provides API access, quota, and reports. API keys can only be used to access public Google profile data, not private contact information.

## Features

### Contact Management

The API facilitates managing contacts by creating, updating, and deleting contacts. Contacts can store rich data fields including names, email addresses, phone numbers, addresses, organizations, birthdays, notes, URLs, and custom fields. Contact photos can also be updated and deleted separately.

- When specifying which fields to retrieve, you must explicitly declare the desired person fields (e.g., `names`, `emailAddresses`, `phoneNumbers`).
- When updating contacts, include the etag field to ensure the contact hasn't changed since last read.
- Only contact-based people can be modified by mutation endpoints. Profile and domain contact mutations are not supported.

#### Contact photos

`manage_contact_photo` updates or deletes a contact photo through the People API's dedicated photo endpoints. Updating requires raw image bytes encoded as base64. Both operations require the full `contacts` scope and return the contact's current names, email addresses, and photos when Google includes the person in its response; the tool succeeds without the person payload otherwise. After deleting a custom photo, Google may expose a default profile photo for the person.

#### Batch operations

`batch_modify_contacts` consolidates the People API batch create, update, delete, and get endpoints:

- `create` accepts up to 200 contact payloads.
- `update` accepts up to 200 contacts and one shared field mask. Each selected field is replaced or cleared for every contact in the request. The tool reads the current People metadata first and rejects stale etags before submitting the batch update. If Google still rejects the batch with an etag mismatch (HTTP 400 `FAILED_PRECONDITION`), the tool reports a validation error asking the caller to re-fetch the contacts for fresh etags. Google may return an empty `updateResult` on success, in which case the reported count falls back to the number of submitted updates.
- `delete` accepts up to 500 contact resource names and permanently deletes their contact data.
- `get` accepts up to 200 contact resource names and preserves Google's per-resource response status. Like the mutating actions, `get` requires the full `contacts` scope; connections granted only `contacts.readonly` should use `get_contact` instead.

Google recommends sending mutation requests for the same user sequentially to avoid lock contention and elevated failure rates.

### Contact Search and Listing

You can list all contacts of the authenticated user and search across contacts by name, email, phone number, and other fields. The People API merges data from various sources like public profiles, private profiles, contacts, and domain information based on verified email addresses, phone numbers, or profile URLs.

### Contact Groups (Labels)

Key actions include creating, deleting, getting, listing, and updating contact groups and their members. Contact groups can be user-defined or system-defined. Key details include the group's name, formatted name, member resource names, and member count. Groups can store client-specific data with key-value pairs.

- Created contact group names must be unique to the user's contact groups.
- The only system contact groups that can have members added are `contactGroups/myContacts` and `contactGroups/starred`. Other system contact groups are deprecated and can only have contacts removed.

### Other Contacts

The API allows managing "Other contacts" by copying them to the user's contact group, listing, and searching them. "Other contacts" are contacts automatically saved by Google from interactions.

- Other contacts are read-only and only names, emailAddresses, and phoneNumbers fields are returned. Requires the `contacts.other.readonly` scope.
- Copying an Other Contact to "My Contacts" requires both the `contacts.other.readonly` and `contacts` scopes.

### Directory Access (Google Workspace)

Google Workspace users can utilize the API to list and search domain profiles and domain contacts. This requires the `directory.readonly` scope and that the domain admin has enabled external contact and profile sharing.

### Profile Information

`get_my_profile` retrieves the authenticated user through `people.get` with `people/me`, requesting names, email addresses, photos, organizations, phone numbers, and biographies. It is read-only and accepts the `contacts`, `contacts.readonly`, or `userinfo.profile` OAuth scope. The general People API can also retrieve public Google profile data without OAuth when the requested fields are public.

## Events

The official Google Contacts API does not appear to have native webhook support. The People API does not provide any built-in webhook or push notification mechanism for contact changes.

The provider does not support events.
