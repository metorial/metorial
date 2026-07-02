# <img src="https://provider-logos.metorial-cdn.com/sendgrid.png" height="20"> Sendgrid

Send transactional and marketing emails at scale. Create and manage dynamic email templates with Handlebars substitution. Manage contact lists, segments, and custom fields for marketing campaigns. Schedule and automate email sequences. Track email delivery and engagement statistics including opens, clicks, bounces, and spam reports. Manage suppression groups, global unsubscribes, bounces, blocks, and invalid emails. Validate email addresses in real-time. Configure sender authentication (SPF, DKIM, DMARC), branded links, and verified sender identities. Manage dedicated IP addresses and IP pools. Parse inbound emails via webhooks. Receive real-time event notifications for delivery and engagement events.

## Tools

### Get Email Stats

Retrieve email delivery and engagement statistics. Returns metrics such as deliveries, opens, clicks, bounces, blocks, and spam reports. Supports global stats or filtering by category.

### Upsert Contacts

Add or update marketing contacts. Contacts are matched by email address — existing contacts are updated, new ones are created. Supports custom fields and list assignment.

### List Contact Lists

Retrieve all marketing contact lists with their contact counts. Use this to find list IDs for adding contacts or sending campaigns.

### List Verified Senders

Retrieve all verified sender identities. Verified senders are required to send emails. Use this to see which sender addresses are available.

### List Suppression Groups

Retrieve all suppression (unsubscribe) groups. These groups allow recipients to opt out of specific email categories while still receiving others.

### List Templates

Retrieve dynamic email templates. Returns template metadata and versions. Use this to browse available templates before sending template-based emails.

### Send Email

Send an email via SendGrid. Supports plain text, HTML, dynamic templates with Handlebars substitution, multiple recipients with personalizations, attachments, scheduling, and tracking settings. Each personalization can target different recipients with different dynamic data.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
