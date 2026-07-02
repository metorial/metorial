# <img src="https://provider-logos.metorial-cdn.com/postmark-logo.svg" height="20"> Postmark

Send transactional and broadcast emails via API with support for HTML, plain text, attachments, and batch sending. Create and manage reusable email templates with dynamic variables. Track email delivery, opens, link clicks, bounces, and spam complaints. Manage message streams to separate transactional and broadcast emails. Search and retrieve sent and received message details. Handle bounce management and reactivate bounced addresses. Manage suppression lists for inactive recipients. Process inbound emails with parsing and routing rules. Configure webhooks for delivery events, bounces, opens, clicks, and spam complaints. Manage sending domains, sender signatures, DNS verification, and DKIM keys. Retrieve aggregate sending statistics filtered by date and tag. Manage servers and account-level settings.

## Tools

### Get Bounces

Retrieve email bounce records from your Postmark server. Search and filter bounces by type, recipient, tag, date range, and message stream. Can also fetch delivery statistics with bounce type breakdowns, or reactivate a bounced email address.

### Get Server

Retrieve your Postmark server's configuration and settings including name, color, SMTP status, tracking preferences, webhook URLs, and inbound settings.

### Get Statistics

Retrieve aggregate sending statistics from your Postmark server. Get an overview of sent counts, bounces, spam complaints, open rates, and click rates. Filter by date range, tag, and message stream.

### Manage Message Streams

List, get, create, update, archive, or unarchive Postmark message streams. Message streams separate your email sending into categories (Transactional, Broadcasts, Inbound) for better organization and deliverability.

### Manage Suppressions

View, create, or delete email suppressions in a Postmark message stream. Suppressed addresses will not receive emails. Use this to list current suppressions, manually suppress addresses, or remove suppressions to re-enable sending.

### Manage Templates

List, get, create, update, or delete email templates on your Postmark server. Templates allow reusable HTML/CSS layouts with dynamic variables for consistent transactional and broadcast emails.

### Manage Webhooks

List, get, create, update, or delete webhooks on your Postmark server. Webhooks notify your application about message events like bounces, deliveries, opens, clicks, spam complaints, and subscription changes.

### Search Messages

Search and retrieve outbound or inbound messages processed by your Postmark server. Filter by recipient, sender, subject, tag, status, date range, and metadata. Useful for auditing, debugging delivery issues, or finding specific messages.

### Send Email

Send a transactional or broadcast email via Postmark. Supports HTML and plain text bodies, CC/BCC recipients, attachments, custom headers, metadata, and open/click tracking. The sender must be a registered and confirmed sender signature in Postmark.

### Send Template Email

Send an email using a pre-defined Postmark template. Pass dynamic variables through the template model to populate the template. Identify the template by its numeric ID or string alias.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
