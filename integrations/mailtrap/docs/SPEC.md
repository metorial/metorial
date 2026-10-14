# Mailtrap Integration Specification

## Authentication

Connect with an API token from Mailtrap API Tokens. Requests use the `Api-Token` header over HTTPS. Tokens have no automatic expiry; reset or rotate them in Mailtrap. The token's resource permissions determine which operations are available.

Current management endpoints select the account from the token. Setup does not require an account ID. `list_accounts` exposes the accessible accounts and access levels for identity inspection.

## Supported capabilities

- `send_transactional_email` and `send_bulk_email`: send text or HTML content with a subject, or use a hosted template UUID. Template messages use the template's subject. Sending requires an authorized, verified domain.
- `manage_contact`: create, retrieve, update, and delete contacts by UUID or email; manage custom fields, list memberships, and unsubscribe state.
- `list_contacts`: search by email substring, list membership, or subscription status; pass `nextPageCursor` as `cursor` for the next page. Pages contain at most 50 contacts.
- `manage_contact_list`: list, create, retrieve, rename, and delete lists.
- `list_sandbox_projects` and `list_sandbox_inboxes`: discover sandbox resources and inbox IDs without exposing SMTP credentials.
- `list_sandbox_messages` and `get_sandbox_message`: search and inspect captured message metadata, HTML/text bodies, spam and HTML reports; mark as read, delete, or forward messages. Forwarding is subject to the account's plan and permissions.
- `manage_sending_domain`: list, create, retrieve, and delete domains; return compliance status and DNS records.
- `manage_suppressions`: list or remove suppressions. Use `suppressionUuid` for current entries; the legacy numeric `suppressionId` input remains available. Pass the last UUID as `lastId` to retrieve another page.
- `get_email_stats`, `list_email_logs`, and `get_email_log`: view aggregate or grouped delivery analytics and search delivery logs.

## API contracts

Management requests use `https://mailtrap.io/api/contacts`, `/api/domains`, `/api/sandboxes`, `/api/projects`, `/api/suppressions`, `/api/stats`, and `/api/email_logs`. Contact create/update requests contain a `contact` object; contact results use `data`.

Transactional sends use `https://send.api.mailtrap.io/api/send`; bulk sends use `https://bulk.api.mailtrap.io/api/send`. Provide a template UUID or body content, never both.

## Official references

- [Authentication](https://docs.mailtrap.io/developers/authentication)
- [Official OpenAPI collection](https://github.com/mailtrap/mailtrap-openapi)
- [Contacts](https://github.com/mailtrap/mailtrap-openapi/blob/main/specs/contacts.openapi.yml)
- [Email management](https://github.com/mailtrap/mailtrap-openapi/blob/main/specs/email-sending.openapi.yml)
- [Sandbox](https://github.com/mailtrap/mailtrap-openapi/blob/main/specs/sandbox.openapi.yml)
- [Transactional sending](https://github.com/mailtrap/mailtrap-openapi/blob/main/specs/email-sending-transactional.openapi.yml)
