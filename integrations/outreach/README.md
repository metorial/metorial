# Outreach

Manage prospects, accounts, sales tasks, opportunities, sequences and reusable email content through Outreach's OAuth REST API.

The integration has 19 tools: prospect and account create/read/update/delete and discovery; sequence creation, updates and activation/deactivation; enrollment discovery and pause/resume/finish; email delivery/engagement readback; task updates; opportunity create/update and discovery; template/snippet create/update; external call logging; user and metadata discovery. Opportunity features require the appropriate Outreach subscription and user permissions. User listing identifies organization users, not the authenticated user.

Use `list_metadata` to discover sending mailboxes, call dispositions/purposes, prospect stages, opportunity stages and configured custom-field definitions. Mailbox credentials are excluded. Custom-field writes use provider keys such as `custom1`, with the configured field's type and validation rules.

OAuth permissions and the user's organization governance both apply. Access tokens expire according to the provider response; refresh tokens rotate. Refresh promptly and reconnect if the rotating refresh token expires. Production OAuth credentials support external organizations; developer credentials have additional authorization restrictions. The distinct limited server-to-server protocol is not supported by this integration.

Lists support cursor pagination: pass `nextPageAfter` back as `pageAfter`, keeping filters and sorting unchanged. Existing `pageOffset` remains available from 0 to 10,000; never combine it with a cursor. Counts are omitted when absent or truncated.

Creating enrollment immediately starts automation. Check the intended prospect, sequence and mailbox before calling it. Sequence activation can start processing existing enrollments. This integration reads mailings and logs calls; it does not send standalone email/SMS or dial phone numbers.

Compatibility inputs remain available with explicit validation: `bodyText` is derived and read-only, so write `bodyHtml`; snippet `read_only` sharing is unsupported; opportunity `externalSource` and call `disposition` are unsupported writable attributes. Calls require the current `outcome` plus direction, prospect and user. Enrollment `disabled` is provider-managed; request `paused`, `active` or `finished`. Task completion is written through the provider's `completed` attribute. A supplied prospect email or phone replaces that corresponding list with one value; an empty string clears it.

API errors conceal tokens and provider response details. Read back uncertain writes before retrying. No webhook or polling triggers are registered.

[Official REST API documentation](https://developers.outreach.io/api/reference)
