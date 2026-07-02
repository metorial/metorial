# <img src="https://provider-logos.metorial-cdn.com/pandadoc.svg" height="20"> Pandadoc

Create, send, track, and electronically sign documents such as proposals, contracts, and quotes. Generate documents programmatically from templates or public PDF URLs, populate them with dynamic data (tokens, fields, recipients, pricing tables, text blocks, tables, and images), and manage the core document lifecycle. Inspect templates, content library items, contacts, recipients, folders, forms, workspace members, and CRM links.

## Tools

### Create Document Link

Create a shareable or embeddable session link for a PandaDoc document, targeted at a specific recipient. The link can be used for embedded signing or direct sharing.

### Create Document

Create a new PandaDoc document from a template or a publicly accessible PDF URL, populating it with recipients, tokens, fields, metadata, pricing data, tables, text blocks, and image blocks. The document is created in draft status and can then be sent for signing.

### Update Document

Update a draft PandaDoc document with mutable values such as name, recipients, fields, tokens, tags, metadata, pricing tables, tables, texts, or images.

### Delete Document

Permanently delete a PandaDoc document by its ID.

### Download Document

Download a PandaDoc document and return the file as a Slate attachment.

### Get Document

Retrieve full details of a PandaDoc document including its status, recipients, fields, tokens, metadata, tags, pricing, and linked objects. Use this to inspect any aspect of a document.

### Get Document Status

Retrieve lightweight document status and lifecycle timestamps. Use this to poll newly created documents until they reach draft status.

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

### List Contacts

List contacts from the PandaDoc contacts directory. Optionally filter by email address.

### Update Contact

Update an existing PandaDoc contact.

### Delete Contact

Delete a contact from the PandaDoc contacts directory.

### Change Document Status

Manually change a PandaDoc document's status to completed, voided, or paid. Use this to force-complete documents, void/expire documents, or mark them as paid.

### List Document Folders

List document folders in the PandaDoc workspace.

### Create Document Folder

Create a new document folder. PandaDoc's public API does not provide a delete-folder endpoint.

### Rename Document Folder

Rename an existing PandaDoc document folder.

### Link CRM Object

Link a PandaDoc document to an external CRM object (e.g., Salesforce opportunity, HubSpot deal). Also supports listing and removing existing links.

### Add Recipient

Add a new recipient (CC) to an existing PandaDoc document. Works on documents in any status.

### Update Recipient

Update recipient delivery and contact details on an existing PandaDoc document.

### Remove Recipient

Remove a recipient from a PandaDoc document.

### Send Document

Send a PandaDoc document to its recipients for viewing, signing, or approval. Optionally customize the email subject and message, or send silently for embedded signing flows.

### Send Reminder

Send a manual reminder to all recipients of a PandaDoc document who have not yet completed their actions.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
