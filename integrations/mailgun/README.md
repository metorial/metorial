# <img src="https://provider-logos.metorial-cdn.com/mailgun.png" height="20"> Mailgun

Send, receive, and track transactional and marketing emails via Mailgun. Send test-mode or production messages with templates, tags, tracking options, and file attachments. Manage sending domains, tracking settings, inbound routes, suppressions, allowlists, mailing lists, reusable templates, current logs and metrics, legacy events and stats, stored messages, validation, and domain webhook notifications.

## Tools

### Get Events

Query Mailgun's legacy Events API for a domain. Prefer Query Logs for current delivery/debug logging.

### Get Stats

Get email sending statistics from Mailgun's legacy Stats API for a domain. Prefer Query Metrics for current analytics.

### Query Logs

Query Mailgun's current Logs API for event logs with filters, pagination, and totals.

### Query Metrics

Query Mailgun's current Metrics API for analytics with dimensions, filters, rates, and aggregates.

### Get Stored Message

Retrieve a stored Mailgun message by storage key and return the stored payload as a Slate attachment.

### Get Domain Tracking

Get the current tracking settings for a domain. Shows whether open tracking, click tracking, and unsubscribe tracking are enabled.

### List Domains

List all sending domains in the Mailgun account. Returns domain names, states, and configuration. Use to discover available domains for sending or to check domain verification status.

### Get Domain

Get detailed information and DNS records for a specific sending domain.

### Create Domain

Create a sending domain and return DNS records for setup.

### Delete Domain

Delete a sending domain.

### Verify Domain

Trigger DNS verification for a sending domain.

### List Mailing Lists

List all mailing lists in the account. Returns list addresses, names, member counts, and access levels.

### Get Mailing List

Get a mailing list by address.

### Create Mailing List

Create a mailing list.

### Update Mailing List

Update mailing list properties.

### Delete Mailing List

Delete a mailing list.

### List Mailing List Members

List members in a mailing list.

### Get Mailing List Member

Get one mailing list member.

### Add Mailing List Member

Add or upsert a mailing list member.

### Update Mailing List Member

Update a mailing list member.

### Remove Mailing List Member

Remove a mailing list member.

### List Routes

List all inbound email routes. Routes define rules for handling incoming emails by matching recipient addresses or headers, then forwarding, storing, or stopping processing.

### Create Route

Create an inbound route.

### Update Route

Update an inbound route.

### Delete Route

Delete an inbound route.

### List Suppressions

List suppressed email addresses for a domain. Retrieves bounces, complaints, or unsubscribes depending on the type selected. Suppressed addresses are blocked from receiving further emails to protect sending reputation.

### Add Suppression

Add an address to a bounce, complaint, or unsubscribe suppression list.

### Remove Suppression

Remove an address from a suppression list.

### List Allowlist

List allowlisted addresses or domains.

### Add Allowlist Entry

Add an email address or domain to the Mailgun allowlist.

### Remove Allowlist Entry

Remove an allowlist entry.

### List Templates

List all email templates for a domain. Templates are reusable email content with variable substitution support.

### Get Template

Get a template and its active version.

### Create Template

Create a domain-level template.

### Update Template

Update template metadata.

### Delete Template

Delete a template.

### Create Template Version

Create a template version.

### List Template Versions

List versions for a template.

### Get Template Version

Get a specific template version.

### Update Template Version

Update template version content, comment, or active status.

### Delete Template Version

Delete a specific template version.

### List Webhooks

List all configured webhooks for a domain. Shows which event types have webhook URLs configured.

### Get Webhook

Get webhook URLs for one domain event type.

### Create Webhook

Create a domain webhook.

### Update Webhook

Replace the webhook URL list for an event type.

### Delete Webhook

Delete webhooks for an event type.

### Send Email

Send an email through Mailgun. Supports plain text, HTML, templates, attachments, inline attachments, personalization, scheduling, tracking options, tags, custom headers, and reply-to addresses.

### Validate Email

Validate an email address in real-time using Mailgun's Email Validation API. Checks if the address is deliverable, identifies disposable and role-based addresses, and provides a risk assessment.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
