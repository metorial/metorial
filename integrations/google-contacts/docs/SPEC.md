# Google Contacts Specification

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
| `https://www.googleapis.com/auth/userinfo.email`          | See your primary Google Account email address.                                      |
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

- Other contacts are read-only; this integration returns names, email addresses, and phone numbers. Requires the `contacts.other.readonly` scope.
- Searching other contacts uses prefix matching and sends a cache warmup request first, because Google updates the search cache lazily; very recent interactions may take a moment to appear. Search returns at most 30 results with no pagination.
- Copying an Other Contact to "My Contacts" requires both the `contacts.other.readonly` and `contacts` scopes.

### Directory Access (Google Workspace)

Google Workspace users can utilize the API to list and search domain profiles and domain contacts. This requires the `directory.readonly` scope and that the domain admin has enabled external contact and profile sharing.

### Profile Information

`get_my_profile` retrieves the authenticated user through `people.get` with `people/me`. It is read-only and accepts the `contacts`, `contacts.readonly`, `userinfo.email`, or `userinfo.profile` OAuth scope. With contacts grants it requests names, email addresses, photos, organizations, phone numbers, and biographies. With only `userinfo.profile`, it requests names and photos; with only `userinfo.email`, it requests email addresses. Fields Google does not provide remain absent. The general People API can also retrieve public Google profile data without OAuth when the requested fields are public.

## Events

Enable callbacks with Google OAuth and either `contacts` or `contacts.readonly`
to receive `contact_changed` from the `contact_events` group. API keys are not
supported. Older connections without recorded scopes must reconnect. Account routing
uses the authenticated `people/me` resource identity, never an email address.

Every 15 minutes, the integration reads `people/me/connections`, requesting
`READ_SOURCE_TYPE_CONTACT`, `LAST_MODIFIED_DESCENDING`, `metadata`, and normalized
contact fields. Pages use a fixed size of 1000 with identical request parameters.
Empty pages with a next token are followed.

The group keeps a checkpoint: the time through which changed contacts have been
fully read. The listing is newest first and has no modification-time filter, so a
check reads from the newest change downward until a whole page is older than one
hour before the checkpoint, or the listing ends. Only then does the checkpoint move,
to the time that read began. The first check has no checkpoint and covers the
preceding hour. A failed check leaves the checkpoint where it was, so the next one
covers the same period again; an interruption of any length is recovered this way.
A checkpoint later than the current time is treated as the current time, and an
unreadable one restarts from the preceding hour with a warning.

One check reads at most 10 pages and stops after 30 seconds. When that is not enough
to reach the checkpoint,
the snapshots read so far are delivered, the checkpoint stays, and the position is
saved: the token of the last page read, the oldest change read, and the time the
read began. The next check rereads that page and continues downward. It continues
only when the reread page still reaches the oldest change already read, which shows
that no change between the two reads was skipped; contacts changed after the read
began sort above the saved position and are picked up by the following check. When
the saved position is refused, no longer joins, repeats, or makes no progress, the
check rereads from the newest change instead, with a limit of 30 pages. Google
Contacts stores at most 25,000 contacts per account, so 30 full pages cover the whole
listing. If that reread still ends before the checkpoint, its snapshots are delivered,
a warning names the oldest change that was read, and the checkpoint moves on; this is
the only case in which older changes are left out. A page token repeated during a
read from the newest change fails the check, and so does a listing that is not an
object with a list of connections; neither moves the checkpoint.

A single contact that Google returns in an unexpected form, for example an email
entry without a value, is skipped instead: the check continues, the checkpoint moves,
and a warning names the contact's resource name, its contact-source ID, the source
update time, and the names of the fields that did not fit, never a name, email
address, phone number, or other contact detail. At most ten such warnings are written
per check, followed by the total number skipped.

Each usable `CONTACT` source revision emits this shape:

```json
{
  "type": "contact_changed",
  "accountId": "people/123456789",
  "contact": {
    "resourceName": "people/c12345",
    "etag": "person-revision",
    "names": [{ "displayName": "Ada Example" }],
    "emailAddresses": [{ "value": "ada@example.com", "type": "work" }]
  },
  "source": {
    "type": "CONTACT",
    "id": "12345",
    "updateTime": "2026-11-10T11:45:00.123456789Z",
    "etag": "contact-source-revision"
  }
}
```

The event ID is the JSON-encoded tuple `[accountId, source.id, source.updateTime,
source.etag ?? null]`. The original timestamp retains Google's nanosecond precision;
it is not replaced with the observation time. Different accounts and different source
revisions have different identities, while overlapping polls reuse the same identity.
Source metadata remains separate from the normalized contact; the person etag is
available for contact operations but is not the source revision identity.

This feed reports snapshots, including newly created contacts. It cannot
classify a snapshot as a creation versus edit, guarantee every intermediate edit,
or report deletions. Profile-only changes, Other Contacts, and directory contacts
are excluded. The first check may emit any eligible revision from the preceding hour.
A contact changed several times between two checks, or during an interruption, is
reported once with its latest revision. The one-hour overlap rereads revisions that
were already reported. The group remembers a short fingerprint and the update time of
every revision it reported inside the overlap, skips those on later checks, and
forgets each one once the overlap has moved past it, so an interruption of any length
does not report a revision twice. A contact that changes again has a new revision and
is reported again. While a read is being continued over several checks, the revisions
reported from its last page are remembered as well, because that page is read again.
At most 10,000 revisions are remembered; beyond that the newest are kept, a warning
is written, and the oldest can be reported a second time. A revision that first becomes
visible in the listing more than an hour after its own timestamp is not observed.
Sources without a usable source ID and timestamp are skipped with a warning rather
than replayed on every check.

The newest-first order and the comparison with each contact source's `updateTime`
follow Google's `LAST_MODIFIED_DESCENDING` description. Google does not document how
long a page token stays valid; the continuation rules above do not depend on it.

Provider references: [connections list and paging](https://developers.google.com/people/api/rest/v1/people.connections/list),
[source revision metadata](https://developers.google.com/people/api/rest/v1/people#Source),
[authenticated identity](https://developers.google.com/people/api/rest/v1/people/get),
and [contact storage limits](https://support.google.com/contacts/answer/148779).
