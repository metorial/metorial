# <img src="https://provider-logos.metorial-cdn.com/mailgun.png" height="20"> Mailgun

Send, receive, and track transactional and marketing emails via API or SMTP. Manage sending domains, DNS verification, and DKIM keys. Route and parse inbound emails with custom rules. Validate email addresses in real-time or in bulk. Manage suppressions (bounces, complaints, unsubscribes), mailing lists, and reusable email templates. Query detailed email analytics, event logs, and deliverability metrics. Monitor IP blocklists, manage dedicated IPs and IP pools, and configure webhook notifications for email events like delivery, opens, clicks, bounces, and complaints.

## Tools

### Get Events

Query the event log for a domain. Returns delivery, open, click, bounce, complaint, and other email events. Filter by event type, recipient, sender, subject, date range, and more. Useful for tracking email delivery status and debugging issues.

### Get Stats

Get email sending statistics for a domain. Returns aggregate counts for events like accepted, delivered, failed, opened, clicked, unsubscribed, and complained over a time range. Useful for monitoring email performance and deliverability.

### Get Domain Tracking

Get the current tracking settings for a domain. Shows whether open tracking, click tracking, and unsubscribe tracking are enabled.

### List Domains

List all sending domains in the Mailgun account. Returns domain names, states, and configuration. Use to discover available domains for sending or to check domain verification status.

### List Mailing Lists

List all mailing lists in the account. Returns list addresses, names, member counts, and access levels.

### List Routes

List all inbound email routes. Routes define rules for handling incoming emails by matching recipient addresses or headers, then forwarding, storing, or stopping processing.

### List Suppressions

List suppressed email addresses for a domain. Retrieves bounces, complaints, or unsubscribes depending on the type selected. Suppressed addresses are blocked from receiving further emails to protect sending reputation.

### List Templates

List all email templates for a domain. Templates are reusable email content with variable substitution support.

### List Webhooks

List all configured webhooks for a domain. Shows which event types have webhook URLs configured.

### Send Email

Send an email through Mailgun. Supports plain text, HTML, and template-based emails with personalization. Can send to up to 1,000 recipients per call with individual personalization via recipient variables. Supports scheduling, tracking options, tags for analytics, custom headers, and reply-to addresses.

### Validate Email

Validate an email address in real-time using Mailgun's Email Validation API. Checks if the address is deliverable, identifies disposable and role-based addresses, and provides a risk assessment.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
