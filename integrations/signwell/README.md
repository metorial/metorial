# Signwell

Create and send electronic signature documents, manage reusable templates, inspect signing status and recipients, send reminders, update recipient details, and download completed signed PDFs. Supports drafts, ordered signing, text tags, and embedded signing URLs.

Use `get_current_user` to inspect the connected user and account. Use `get_template` to discover placeholder names and field API IDs before calling `create_document_from_template`.

Each field array corresponds to a file, in file order. Page numbers start at 1 within that file. For each upload, provide exactly one of `fileUrl` or `fileBase64`. Documents can be sent with positioned fields, text tags, or an added signature page.

`get_completed_pdf` prepares the signed PDF with its audit page for download and retains the provider's PDF URL. Test mode applies to document creation; documents created in test mode are not legally binding.

API reference: [SignWell Developer API](https://developers.signwell.com/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
