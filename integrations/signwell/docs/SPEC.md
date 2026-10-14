# SignWell Integration

SignWell provides API-key authentication at `https://www.signwell.com/api/v1` with the `X-Api-Key` header. The credentials endpoint returns membership information and nested user, account, and workspace data.

## Document workflows

- Create documents from uploaded files or a saved template, either as drafts or sent immediately.
- Upload each file using exactly one public file URL or base64 source.
- Supply fields as one array per file and use page numbers starting at 1 within each file. Alternatively, enable text tags or add a signature page when creating a document.
- Inspect document status, recipients, metadata, and field identifiers.
- Update optional name, email subject, email message, reminders, expiration, or metadata when sending a draft.
- Remind unsigned recipients or delete documents to cancel signing.
- Update a recipient's name or email before that recipient starts signing. The document must be sent, viewed, pending, or bounced; partial updates retain the other required value from the current document.
- Download completed PDFs with the audit page. The existing `pdfUrl` output contains the provider's download URL.

## Template workflows

Create, retrieve, update, and delete templates at `/document_templates`. Retrieve placeholder names and field API IDs before assigning recipients and prefilling template fields. Updating `draft` to false makes a template available for document creation.

## Connected account

`get_current_user` exposes the user, membership role, account, workspace, and plan tier associated with the connected API key.

## Sources

- [Credentials](https://developers.signwell.com/reference/getme)
- [Create document](https://developers.signwell.com/reference/createdocument)
- [Create from template](https://developers.signwell.com/reference/createdocumentfromtemplate)
- [Retrieve document](https://developers.signwell.com/reference/getdocument)
- [Send document](https://developers.signwell.com/reference/senddocument)
- [Update recipients](https://developers.signwell.com/reference/updaterecipients)
- [Completed PDF](https://developers.signwell.com/reference/getcompletedpdf)
- [Create template](https://developers.signwell.com/reference/createtemplate)
- [Update template](https://developers.signwell.com/reference/updatetemplate)

## Limits

API requests remain subject to provider rate limits and document state restrictions. API keys, templates, and workspace settings must permit the requested operations. Test-mode documents do not count toward document API billing and are not legally binding. SMS, bulk sending, webhook registration, and regional compliance endpoints are not exposed by this integration's tools.
