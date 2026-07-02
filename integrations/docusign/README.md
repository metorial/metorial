# <img src="https://provider-logos.metorial-cdn.com/docusign.svg" height="20"> Docusign

Send, sign, and manage documents and agreements electronically. Create and track envelopes with documents and recipients, configure signing workflows (sequential and parallel), and manage templates. Embed signing and sending experiences directly within applications. Support bulk sending to large recipient lists, create self-service PowerForms, and manage clickwrap agreements. Track envelope and recipient status in real-time, download signed documents, and retrieve audit trails. Administer users, groups, and account settings. Create web forms, manage real estate transaction rooms, and configure webhooks for envelope and recipient status change notifications.

## Tools

### Create Embedded Signing URL

Generates a URL for embedded signing, allowing a recipient to sign documents directly within your application. The signer must have been created with a **clientUserId** when the envelope was sent. The returned URL is valid for a limited time (typically 5 minutes).

### Create Sender View

Generates a URL for DocuSign's embedded sender view so a user can prepare, tag, and send a draft envelope inside your application. Uses DocuSign's current sender-view request format with **viewAccess** set to **envelope**.

### Delete Envelope

Moves an envelope from its current folder to DocuSign Deleted Items. Useful for discarding draft envelopes and cleaning up test envelopes. Moving an in-process sent or delivered envelope to Deleted Items voids it in DocuSign.

### Download Document

Downloads a document from a DocuSign envelope as a Slate attachment. Can download individual documents by ID, all documents combined, the archive ZIP, the completion certificate, or list available documents in the envelope.

### Get Envelope Audit Events

Retrieves audit events for an envelope, including lifecycle and recipient activity records used for compliance review.

### Get Envelope Recipients

Retrieves all recipients for a DocuSign envelope, including their status, signing order, and optionally their tab (form field) data. Useful for tracking who has signed and who hasn't.

### Get Envelope

Retrieves detailed information about a specific DocuSign envelope, including its status, sender, recipients, and documents. Optionally includes recipient details and custom fields.

### List Envelopes

Searches and lists DocuSign envelopes with flexible filtering by date range, status, text, and more. Returns up to 1000 envelopes per call with pagination support. Use **fromDate** to specify the start of the search window (required unless envelopeIds are provided).

### List Templates

Lists and searches DocuSign templates available in the account. Returns template details including name, description, and recipient roles. Use search to find specific templates by name or keyword.

### Get Template

Retrieves the definition of a specific DocuSign template, including subject, documents, and placeholder recipient roles.

### Send Envelope from Template

Creates and sends a DocuSign envelope using a pre-existing template. Assign recipients to template roles and optionally override the email subject, message, and tab values. Use **List Templates** first to find the templateId and available role names.

### Send Envelope

Creates and sends a DocuSign envelope with documents for electronic signature. Supports inline documents with signers, carbon copy recipients, sequential/parallel signing workflows, and embedded signing. Set **status** to **sent** to send immediately or **created** to save as a draft.

### Void Envelope

Voids (cancels) a DocuSign envelope that has been sent but not yet completed. All recipients are notified that the envelope has been voided. A reason must be provided.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
