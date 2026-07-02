# <img src="https://provider-logos.metorial-cdn.com/hellosign-logo.png" height="20"> Hellosign

Send documents for electronic signature via email or embedded signing flows. Create and manage reusable signature templates with merge fields and signer roles. Embed signing experiences directly into applications via iframes. Track signature request status through lifecycle events (sent, viewed, signed, declined, expired). Bulk send template-based requests to multiple signers. Manage teams, accounts, and API apps. Create unclaimed drafts for embedded requesting workflows. Configure webhooks for real-time signature event notifications. Send faxes and manage fax lines. Generate reports on signature request activity. Supports signer authentication via access codes and SMS PIN, document form fields, CC recipients, and white-label branding.

## Tools

### Download Files

Get a download URL for the documents associated with a signature request or template. Returns a temporary URL that can be used to download the files as PDF or ZIP.

### Get Account

Retrieve the current Dropbox Sign account details including email address, callback URL, quota information, and role.

### Get Embedded URLs

Get an embedded signing URL for a signer or an embedded editing URL for a template. These URLs are used to embed Dropbox Sign experiences into your application via iFrame. URLs are short-lived and expire quickly.

### Get Signature Request

Retrieve the full details and current status of a signature request, including all signer statuses, response data, custom fields, and metadata.

### Get Template

Retrieve the full details of a signature request template including its signer roles, CC roles, form fields, and associated documents.

### List Signature Requests

List signature requests with pagination and optional search filtering. Returns a summary of each request including title, status, and signer information.

### List Templates

List available signature request templates with pagination and optional search filtering. Returns template details including title, signer roles, and CC roles.

### Manage Signature Request

Perform actions on an existing signature request: cancel it, remove your access, send a reminder to a signer, or update signer details. Combine related management actions into a single call.

### Manage Team

View team information or manage team membership. Retrieve team details, update the team name, add members, or remove members.

### Manage Template

Manage a signature request template: update its properties (title, subject, message), delete it, or manage user access by adding or removing users who can use the template.

### Send Signature Request

Send documents for electronic signature to one or more signers via email. Supports uploading documents via URL, setting signer order, adding CC recipients, access codes for signer authentication, and attaching metadata.

### Send Template Signature Request

Send a signature request based on one or more existing templates. Templates define the document layout, signer roles, and form fields. You assign actual signers to the template roles and optionally pre-fill custom fields.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
