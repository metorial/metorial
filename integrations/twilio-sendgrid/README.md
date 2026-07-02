# <img src="https://provider-logos.metorial-cdn.com/sendgrid.png" height="20"> Twilio Sendgrid

Send transactional and marketing emails at scale. Create and manage dynamic email templates with Handlebars syntax. Manage contacts, lists, and segments for targeted campaigns. Validate email addresses in real-time or bulk. Monitor email delivery with detailed statistics on opens, clicks, bounces, and more. Manage suppressions including bounces, blocks, spam reports, and unsubscribes. Configure inbound email parsing to receive and process incoming emails. Authenticate sender domains (DKIM, SPF) and manage dedicated IP addresses and IP pools. Create and automate marketing campaigns with A/B testing. Manage subusers, teammates, and API keys with granular permissions. Receive real-time webhook events for delivery status, engagement tracking, and account changes.

## Tools

### Get Email Statistics

Retrieve email sending statistics for your SendGrid account. Get global stats or filter by categories. Data includes delivery rates, engagement metrics (opens, clicks), bounces, and more. Useful for monitoring email performance and deliverability.

### Add or Update Contacts

Add new contacts or update existing ones in SendGrid Marketing. Contacts are matched by email address. Optionally assign contacts to one or more lists simultaneously.

### Get Contact Lists

Retrieve all contact lists in your SendGrid Marketing account with their names and contact counts.

### Get Authenticated Domains

List all authenticated (whitelabeled) domains in your SendGrid account. Shows DKIM and SPF authentication status, required DNS records, and configuration details.

### Get Suppressions

Retrieve email suppressions from SendGrid, including bounces, blocks, spam reports, invalid emails, and global/group unsubscribes. Use the **type** parameter to select which suppression category to query.

### Get Templates

List all transactional and dynamic templates in your SendGrid account. Includes version information for each template.

### Send Email

Send transactional or marketing emails via SendGrid. Supports personalizations for per-recipient customization, dynamic templates, attachments, and tracking settings. Use **templateId** to send using a pre-built dynamic template, or provide **content** directly with HTML/plain text.

### Validate Email

Validate a single email address in real time using SendGrid's Email Validation API. Returns a verdict (Valid, Risky, or Invalid), a confidence score, and suggested corrections for typos. Useful for verifying email addresses before adding them to your contact lists or sending emails.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
