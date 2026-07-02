# <img src="https://provider-logos.metorial-cdn.com/sendgrid.png" height="20"> Sendgrid

Send transactional and marketing emails at scale. Create and manage dynamic email templates with Handlebars substitution. Manage contact lists, segments, and custom fields for marketing campaigns. Schedule and automate email sequences. Track email delivery and engagement statistics including opens, clicks, bounces, and spam reports. Manage suppression groups, global unsubscribes, bounces, blocks, and invalid emails. Validate email addresses in real-time. Configure sender authentication (SPF, DKIM, DMARC), branded links, and verified sender identities. Manage dedicated IP addresses and IP pools. Parse inbound emails via webhooks. Receive real-time event notifications for delivery and engagement events.

## Tools

### Get Email Stats

Retrieve email delivery and engagement statistics. Returns metrics such as deliveries, opens, clicks, bounces, blocks, and spam reports. Supports global stats or filtering by category.

### List Event Webhooks

Retrieve configured SendGrid Event Webhooks and the delivery or engagement events each webhook subscribes to.

### Upsert Contacts

Add or update marketing contacts. Contacts are matched by email address — existing contacts are updated, new ones are created. Supports custom fields and list assignment.

### Get Contact Import Status

Check the asynchronous job status returned by contact upsert, contact import, or contact deletion operations.

### Get Contact Count

Retrieve the total marketing contact count for the SendGrid account, including billable contact count when available.

### Search Contacts

Search marketing contacts using SendGrid's SGQL (SendGrid Query Language). Returns matching contacts with their full profile data.

### Get Contact

Retrieve a single marketing contact by ID. Returns the full contact profile including custom fields.

### Delete Contacts

Delete marketing contacts by ID, or delete all contacts in the account. Deletion is asynchronous.

### List Contact Lists

Retrieve all marketing contact lists with their contact counts. Use this to find list IDs for adding contacts or sending campaigns.

### Get Contact List

Retrieve a single marketing contact list by ID, optionally including a sample of recent contacts.

### Get Contact List Count

Retrieve the contact and billable counts for a specific marketing contact list.

### Create Contact List

Create a new marketing contact list for organizing and segmenting contacts.

### Add Contacts To List

Add or update contacts and assign them to a marketing contact list. SendGrid processes this asynchronously and returns a job ID.

### Update Contact List

Rename an existing marketing contact list.

### Delete Contact List

Delete a marketing contact list. Optionally also delete the contacts that belong to the list.

### Remove Contact From List

Remove a contact from a specific contact list without deleting the contact itself.

### List Verified Senders

Retrieve all verified sender identities. Verified senders are required to send emails. Use this to see which sender addresses are available.

### Create Verified Sender

Create a new verified sender identity. A verification email will be sent to the provided address.

### Delete Verified Sender

Delete a verified sender identity by its ID.

### Resend Sender Verification

Resend the verification email for a verified sender identity that has not yet been verified.

### List Suppression Groups

Retrieve all suppression (unsubscribe) groups. These groups allow recipients to opt out of specific email categories while still receiving others.

### Get Suppression Group

Retrieve a single suppression (unsubscribe) group by ID, including its default status and unsubscribe count.

### Create Suppression Group

Create a new suppression (unsubscribe) group.

### Update Suppression Group

Update a suppression (unsubscribe) group's name, description, or default status.

### Delete Suppression Group

Delete a suppression (unsubscribe) group by ID.

### Add Suppressed Emails

Add email addresses to a suppression group or the global unsubscribe list.

### Remove Suppressed Email

Remove an email address from a suppression group or the global unsubscribe list.

### List Suppressions

Retrieve suppressed email addresses by type: bounces, blocks, spam reports, invalid emails, global unsubscribes, or group suppressions.

### List Templates

Retrieve dynamic email templates. Returns template metadata and versions. Use this to browse available templates before sending template-based emails.

### Get Template

Retrieve a single dynamic template by ID, including all its versions and content.

### Create Template

Create a new dynamic email template. Optionally create the first version in the same operation.

### Update Template

Update a template's name or manage template versions.

### Delete Template

Delete a dynamic template and all its versions, or delete a specific version of a template.

### Send Email

Send an email via SendGrid. Supports plain text, HTML, dynamic templates with Handlebars substitution, multiple recipients with personalizations, attachments, scheduling, and tracking settings. Each personalization can target different recipients with different dynamic data.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
