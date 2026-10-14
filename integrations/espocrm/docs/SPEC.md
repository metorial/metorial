# EspoCRM Integration

Manage CRM records and activity in a self-hosted or cloud EspoCRM instance.
The API uses your instance's site URL with the `/api/v1/` path. Roles and instance
customizations determine which entity types, fields, and actions are available.

## Authentication

Set the site URL to the address used to open EspoCRM in your browser. Choose one
of the supported authentication methods:

- **API Key:** create an API User under Administration > API Users, choose API
  Key authentication, and assign roles with the required entity permissions.
- **HMAC:** create an API User with HMAC authentication and provide its API Key
  and Secret Key. Requests are signed with HMAC-SHA256.
- **Basic:** provide a regular user's username and password or authentication
  token. EspoCRM recommends API Users for integrations. A token can be obtained
  through `GET App/user` and used in place of the password.

Use `get_current_user` to identify the connected user. Its result contains
profile and team identifiers; authentication tokens are not returned.

See the [official authentication documentation](https://docs.espocrm.com/development/api/#authentication).

## Record management

Dedicated tools manage Contacts, Accounts, Leads, Opportunities, Cases,
Meetings, Calls, and Tasks. `manage_record` additionally creates, updates, or
deletes any entity type supported by the instance, including custom entities.
Supply field names and values defined in Administration > Entity Manager.

`get_record` retrieves a record by ID. `list_records` searches and lists records
with field selection, sorting, pagination, text search, primary filters,
boolean filters, and structured where conditions. When record counting is
disabled, EspoCRM returns a negative total: `-1` means another page exists and
`-2` means the last page. The tool's `hasMore` value handles these sentinels.

`manage_relationships` links, unlinks, or lists related records using the link
name configured in Entity Manager. Call and Meeting durations are supplied in
minutes. Date and time values use `YYYY-MM-DD HH:mm:ss` in UTC.

See [CRUD operations](https://docs.espocrm.com/development/api/crud/),
[search parameters](https://docs.espocrm.com/development/api-search-params/), and
[related records](https://docs.espocrm.com/development/api/relationships/).

## Lead conversion

`convert_lead` copies attributes using the instance's lead conversion settings.
Accounts and Contacts are created by default; Opportunities are opt-in. An
existing `accountId` is associated through a newly created Contact or
Opportunity instead of creating another Account. The result includes the IDs
of the resulting records. Conversion respects create permissions and duplicate
checks.

## Email and streams

`send_email` sends email through the instance's configured outgoing email
account. It accepts a parent record and previously uploaded attachment IDs.
`post_stream_note` posts a comment to a record's activity stream. `list_stream`
reads the current user's stream or a particular record's notes and updates.

See the [stream API](https://docs.espocrm.com/development/api/stream/).

## Files and PDFs

`manage_attachments` uploads base64 file content, prepares an existing file for
download, or deletes a file. To upload to a File or Attachment-Multiple field,
provide the corresponding `relatedType` or `parentType` and `field`. After
uploading, update the owning record's file ID or attachment ID array.

`generate_pdf` produces a downloadable document for one record using a PDF
template. Use `list_records` with entity type `Template` to find template IDs.
EspoCRM removes the generated temporary file after one hour; the tool retrieves
its contents immediately for download.

See the [attachment API](https://docs.espocrm.com/development/api/attachment/).
