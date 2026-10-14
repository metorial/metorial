# <img src="logo.webp" height="20"> Docupilot

Automate document generation from templates by merging dynamic data into merge fields. Create, list, update, and delete document templates in formats like DOCX, PPTX, XLSX, and fillable PDF. Generate documents (PDF, DOCX, HTML, PNG) by submitting JSON data matching template tokens, with support for nested data and arrays. Organize templates into folders. Configure automatic document deliveries to destinations including Email, Google Drive, OneDrive, Dropbox, Amazon S3, Azure Blob, SFTP, and webhooks. Send generated documents for eSignature with built-in AES-compliant signing, signer field placement, reminders, and audit trails. Supports bulk document creation, content library for reusable snippets, password-protected PDFs, and auto-numbering across generated documents.

## Connection and capabilities

Connect using the API key and secret created under **Settings > API Settings**,
plus the workspace ID from Workspace details. The connection uses the
Base64-encoded key and secret as a Bearer credential.

Use `get_current_user` to inspect the connected user. The integration supports
existing workspace template, folder, delivery, content-library, history, and
signing operations. `generate_document` provides a downloadable file when the
provider returns a file URL; its `fileUrl` output remains available for existing
workflows. Provider links expire according to workspace data retention settings.

The current public API overview documents the account request at
`https://api-us1.docupilot.app/accounts/user/me/`. Detailed workspace API
contracts require your organization's interactive V2 API reference. Existing
workspace routes are retained for compatibility.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
