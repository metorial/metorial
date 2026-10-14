# Mailsoftly Integration

Mailsoftly provides contact, audience, tag, and email campaign management. The
integration uses the current v3 REST API at `https://app.mailsoftly.com/api/v3`.

Official references: [API documentation](https://app.mailsoftly.com/developers)
and [OpenAPI specification](https://app.mailsoftly.com/developers/openapi.json).

## Authentication and account discovery

API keys go in the `Authorization` header without a Bearer prefix. Generate a
key under Settings → API Keys. The connection profile uses `POST /authentication`.
`get_current_account` identifies the connected firm and reads account details,
plan limits, sending channels, and restrictions from `GET /get_account`.

## Contacts and audiences

`create_or_update_contact` submits `contact_id` in the JSON body when supplied;
without an ID, Mailsoftly matches by email or creates a contact. An unknown ID
can create a new contact. Custom fields are assigned using the documented
`add_custom_field_to_contact` operation after the contact is saved, then the
full contact is fetched. This sequence is not atomic: a failed field write can
leave the contact and earlier fields saved, and the error identifies the
contact and field to retry.

`get_contacts` reads a contact by ID or lists contacts. `search_contacts` uses
exact email, first-name, and last-name matches. The existing `customCriteria`
field accepts those API field names; unsupported fields fail with guidance
rather than pretending to search custom fields.

Contact listings, search results, and contact-list members accept optional
`page` and `perPage` (maximum 500) and expose page, per-page, total, and has-more
metadata. Omitting pagination retains the provider's legacy listing, capped at
10,000 contacts. When a legacy result is truncated, start a complete paginated
traversal at page 1. `manage_contact_lists` creates or reads lists and
`manage_contact_list_members` reads members or adds existing/new contacts. Bulk
membership results retain the provider's added count and individual errors.

`get_contact_fields` reads standard fields and optionally custom fields. The
custom-field map is represented as an array of field names and types.
`manage_tags` lists tags or assigns one/many tags, including optional colors.
Mutation identifiers are submitted in the JSON body.

## Campaign workflow

`list_senders` discovers sender addresses and the parameter used to select each
one: team members use `senderId`, while connected mailboxes and shared senders
use `emailSenderId`. Exactly one ID can be supplied. Existing sender name/email
inputs resolve against this list and must identify one available sender.

`create_email_campaign` uses `POST /create_emails` with exactly one audience:
an existing contact list or recipient objects. Plain-text content is escaped
into a content fragment; `htmlBody` is sent as a complete HTML email and takes
precedence when both bodies are supplied. Attachment URL strings become the
provider's required URL/filename objects, with up to 20 HTTP/HTTPS URLs.

Recipient lists and attachments are prepared asynchronously. Use
`get_email_campaigns` with the created draft ID to read `GET /email_status?id=...`
until `ready_to_send` is true. That response also reports sender authorization
and any campaign gate. API keys cannot send through teammate-owned Gmail or
Microsoft mailboxes. `send_email` submits the draft ID as `id` in the JSON body;
success indicates acceptance for asynchronous delivery.

Without a draft ID, `get_email_campaigns` reads `GET /list_campaigns`, with
optional page, page size (maximum 100), status, and name/subject query. It returns
pagination metadata. `get_campaign_statistics` retrieves delivery and engagement
counts/rates, or a summary and note for a campaign that has not been sent.

## Verification boundary

This package refresh is checked against official API contracts and local build
verification. Provider calls, delivery, and production behavior have not been
verified with live credentials. Webhook and automation capabilities are outside
this refresh.
