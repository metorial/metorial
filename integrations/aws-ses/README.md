# <img src="https://provider-logos.metorial-cdn.com/amazon.svg" height="20"> Aws Ses

Send formatted, raw, and bulk templated emails to recipients. Create and manage reusable email templates with personalization variables. Manage contact lists and topic-based subscription preferences. Verify and configure sending identities (email addresses and domains) with DKIM authentication. Create configuration sets to control delivery options, reputation monitoring, and event tracking. Manage account-level suppression lists for bounces and complaints. Organize dedicated IP addresses into pools for reputation isolation. Monitor deliverability with Virtual Deliverability Manager dashboard and sending statistics. Track email events including sends, deliveries, bounces, complaints, opens, and clicks. Process inbound emails with receipt rules and filters (v1 API).

## Tools

### Get Account Info

Retrieve SES account details including sending quotas, reputation status, enforcement status, and whether the account has production access. Also shows suppression and Virtual Deliverability Manager (VDM) settings.

### Get Message Insights

Retrieve detailed delivery insights for a specific sent email by its message ID. Shows delivery events per recipient, including delivery status, bounces, complaints, opens, and clicks. Useful for troubleshooting delivery issues and tracking individual message outcomes.

### Manage Configuration Set

Create, retrieve, delete, or list SES configuration sets. Configuration sets control delivery options, reputation monitoring, click/open tracking, and suppression behavior for emails. You can also update individual options (sending, reputation, tracking, suppression) on an existing set.

### Manage Contact List

Create, update, retrieve, delete, or list SES contact lists. Contact lists enable subscription management and compliance with unsubscribe requirements. Each list can have multiple topics that contacts can individually subscribe to or opt out of.

### Manage Contact

Create, update, retrieve, delete, or list contacts within an SES contact list. Contacts represent email recipients with topic-based subscription preferences. Use this to manage individual subscriber preferences and compliance status.

### Manage Dedicated IP Pool

Create, retrieve, delete, or list dedicated IP pools in SES. Dedicated IP pools group IPs for isolated sender reputation management. Pools can operate in **Standard** (manually managed) or **Managed** (AWS handles warmup and optimization) mode.

### Manage Email Identity

Verify and manage sending identities (email addresses or domains) in SES. Identities must be verified before they can be used as a "From" address. Supports creating identities with DKIM configuration, managing mail-from domains, enabling/disabling DKIM signing, and toggling feedback forwarding.

### Manage Email Template

Create, update, retrieve, delete, or list SES email templates. Templates support placeholder variables for personalization and can be used with both single and bulk email sending. Use the **testRender** action to preview how a template renders with sample data.

### Manage Event Destination

Create, list, or delete event destinations on an SES configuration set. Event destinations publish email sending events (sends, deliveries, bounces, complaints, opens, clicks, etc.) to SNS topics, CloudWatch, or EventBridge for monitoring and alerting.

### Manage Suppression List

Manage the account-level suppression list in SES. Add, remove, retrieve, or list suppressed email addresses. Addresses on the suppression list will not receive emails. Addresses can be suppressed due to bounces or complaints.

### Send Bulk Email

Send a templated email to multiple recipients in bulk. Each recipient can have personalized replacement data. Uses SES email templates for consistent formatting with per-recipient customization.

### Send Email

Send an email through AWS SES. Supports three content modes: - **Simple**: Provide subject and body (text/HTML) — SES handles MIME formatting. - **Raw**: Supply a complete MIME message for full control over headers and content. - **Template**: Use a pre-created SES template with dynamic replacement data. Emails can be sent to multiple recipients via To, Cc, and Bcc fields.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
