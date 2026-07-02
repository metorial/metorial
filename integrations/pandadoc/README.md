# <img src="https://provider-logos.metorial-cdn.com/pandadoc.svg" height="20"> Pandadoc

Create, send, track, and electronically sign documents such as proposals, contracts, and quotes. Generate documents programmatically from templates or file uploads, populate them with dynamic data (tokens, fields, recipients, pricing tables), and manage the full document lifecycle. Embed document editing, sending, and signing experiences directly in applications. Manage templates, content library items, contacts, and a product catalog. Link documents to external CRM objects, manage workspaces and users, handle notarization requests, and configure webhooks for real-time event notifications on document state changes, recipient completions, and template updates.

## Tools

### Create Document Link

Create a shareable or embeddable session link for a PandaDoc document, targeted at a specific recipient. The link can be used for embedded signing or direct sharing.

### Create Document

Create a new PandaDoc document from a template, populating it with recipients, tokens, fields, metadata, and pricing data. The document is created in draft status and can then be sent for signing.

### Delete Document

Permanently delete a PandaDoc document by its ID.

### Download Document

Get the download URL for a completed PandaDoc document PDF.

### Get Document

Retrieve full details of a PandaDoc document including its status, recipients, fields, tokens, metadata, tags, pricing, and linked objects. Use this to inspect any aspect of a document.

### Get Template

Retrieve full details of a PandaDoc template including its roles, fields, tokens, pricing tables, content placeholders, and metadata.

### List Content Library

List and search content library items in PandaDoc. Content library items are reusable content blocks that can be inserted into documents via content placeholders.

### List Documents

Search and list PandaDoc documents with filtering by status, date ranges, template, folder, tag, contact, and metadata. Supports pagination and sorting.

### List Forms

List all available forms in the PandaDoc workspace. Forms allow external recipients to fill out information that generates documents.

### List Workspace Members

List all members in the current PandaDoc workspace, including their roles and contact info.

### List Templates

Search and list PandaDoc templates with optional filtering by name, folder, tag, and sharing status. Supports pagination.

### Create Contact

Create a new contact in the PandaDoc contacts directory. Contacts can be used as recipients when creating documents.

### Change Document Status

Manually change a PandaDoc document's status to completed, voided, or paid. Use this to force-complete documents, void/expire documents, or mark them as paid.

### List Document Folders

List document folders in the PandaDoc workspace. Optionally create a new folder or move a document into a folder.

### Link CRM Object

Link a PandaDoc document to an external CRM object (e.g., Salesforce opportunity, HubSpot deal). Also supports listing and removing existing links.

### Add Recipient

Add a new recipient (CC) to an existing PandaDoc document. Works on documents in any status.

### Send Document

Send a PandaDoc document to its recipients for viewing, signing, or approval. Optionally customize the email subject and message, or send silently for embedded signing flows.

### Send Reminder

Send a manual reminder to all recipients of a PandaDoc document who have not yet completed their actions.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
