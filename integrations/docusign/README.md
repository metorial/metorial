# <img src="https://provider-logos.metorial-cdn.com/docusign.svg" height="20"> Docusign

Send, sign, and manage documents and agreements electronically. Create and track envelopes with documents and recipients, configure signing workflows (sequential and parallel), and manage templates. Embed signing and sending experiences directly within applications. Support bulk sending to large recipient lists, create self-service PowerForms, and manage clickwrap agreements. Track envelope and recipient status in real-time, download signed documents, and retrieve audit trails. Administer users, groups, and account settings. Create web forms, manage real estate transaction rooms, and configure webhooks for envelope and recipient status change notifications.

## Tools

### Create Embedded Signing URL

Generates a URL for embedded signing, allowing a recipient to sign documents directly within your application. The signer must have been created with a **clientUserId** when the envelope was sent. The returned URL is valid for a limited time (typically 5 minutes).

### Download Document

Downloads a document from a DocuSign envelope as base64-encoded content. Can download individual documents by ID, all documents combined, or list available documents in the envelope.

### Get Envelope Recipients

Retrieves all recipients for a DocuSign envelope, including their status, signing order, and optionally their tab (form field) data. Useful for tracking who has signed and who hasn't.

### Get Envelope

Retrieves detailed information about a specific DocuSign envelope, including its status, sender, recipients, and documents. Optionally includes recipient details and custom fields.

### List Envelopes

Searches and lists DocuSign envelopes with flexible filtering by date range, status, text, and more. Returns up to 1000 envelopes per call with pagination support. Use **fromDate** to specify the start of the search window (required unless envelopeIds are provided).

### List Templates

Lists and searches DocuSign templates available in the account. Returns template details including name, description, and recipient roles. Use search to find specific templates by name or keyword.

### Send Envelope from Template

Creates and sends a DocuSign envelope using a pre-existing template. Assign recipients to template roles and optionally override the email subject, message, and tab values. Use **List Templates** first to find the templateId and available role names.

### Send Envelope

Creates and sends a DocuSign envelope with documents for electronic signature. Supports inline documents with signers, carbon copy recipients, sequential/parallel signing workflows, and embedded signing. Set **status** to \

### Void Envelope

Voids (cancels) a DocuSign envelope that has been sent but not yet completed. All recipients are notified that the envelope has been voided. A reason must be provided.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
