# MailerSend integration specification

Use an API token with Bearer authentication at `https://api.mailersend.com/v1`. Create the token in the MailerSend dashboard and grant only the permissions needed for the tools you use. Tokens can be domain scoped. No connection configuration fields are required.

## Supported tools

- `send_email`: send HTML, text, or a saved template; personalize content, include CC/BCC and file attachments, and schedule delivery. Templates with a default sender allow `from` to be omitted. Accepted messages return a message ID, provider warnings, and paused-sending state. A 202 response with all recipients suppressed creates no message and returns `accepted: false`.
- `send_sms`: send transactional SMS with personalization and report the message ID and paused-sending state.
- `list_templates`, `get_template`, `delete_template`: discover and inspect templates or delete them.
- `list_domains`, `get_domain`, `create_domain`, `delete_domain`, `verify_domain`: manage sending domains and inspect their verification status and DNS records. DNS records include their provider record names.
- `list_identities`, `create_identity`, `update_identity`, `delete_identity`: manage verified sender addresses and reply-to details.
- `verify_single_email`: return the provider's verification status for one email address. This operation uses verification credits.
- `create_verification_list`, `list_verification_lists`, `get_verification_list`, `start_verification_list`, `get_verification_list_results`: upload addresses, discover list IDs, optionally start immediately with `verify`, monitor processing, start an uploaded list, and inspect paginated per-address results.
- `get_activity`: query domain email events in a UTC timestamp range with filters. The date range depends on plan retention. Unique opens, unique clicks, and suppressed events are supported; some event categories require a paid plan.
- `list_recipients`, `get_recipient`, `delete_recipient`: inspect recipients and their history or delete records.
- `get_suppressions`, `add_to_suppressions`, `remove_from_suppressions`: manage blocklist, hard-bounce, spam-complaint, and unsubscribe entries. Patterns apply only to blocklists. Clearing an entire list requires an explicit domain ID.

List outputs expose provider pagination metadata and adjacent-page links when available. Existing `total` fields use the provider total when supplied and otherwise report the number of records on the current page. Failed provider requests raise an error with the provider's status and message.

The documented account-user API retrieves users by ID and does not identify the authenticated token's current user. No current-user tool is exposed. This integration does not expose inbound routing, API-token administration, SMTP users, team permissions, DMARC reports, bulk email sending, or triggers.

## Official API references

- [General resources and authentication](https://developers.mailersend.com/general)
- [Email sending](https://developers.mailersend.com/api/v1/email)
- [SMS sending](https://developers.mailersend.com/api/v1/sms)
- [Email verification](https://developers.mailersend.com/api/v1/verification/email)
- [Domains and DNS](https://developers.mailersend.com/api/v1/email/domains)
- [Sender identities](https://developers.mailersend.com/api/v1/email/sender-identity)
- [Activity](https://developers.mailersend.com/api/v1/email/activity)
- [Recipients and suppressions](https://developers.mailersend.com/api/v1/email/recipients)
- [Templates](https://developers.mailersend.com/api/v1/email/templates)
- [Account users](https://developers.mailersend.com/api/v1/account/users)
