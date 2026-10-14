# <img src="logo.svg" height="20"> Boldsign

Send documents and templates for electronic signature, place signer form fields, and enable embedded signing. List and inspect documents, templates, users, brands, and saved contacts. Revoke documents, send reminders, extend signing deadlines, and move documents to Trash or permanently delete them. Download signed PDFs and audit trails. Connect with a BoldSign API key or OAuth 2.0 and choose the US or EU API region.

## Notes

- `send_document` requires a title and at least one publicly accessible document URL. Assign `formFields` to signers or enable `useTextTags` for documents containing field tags.
- Passing `reminderSettings` enables automatic reminders by default. Set `enableAutoReminder` to false to disable them.
- `manage_document` with action `delete` moves the document to Trash by default. Set `deletePermanently` to true only for permanent deletion.
- OAuth requests use PKCE and `offline_access` for token refresh. Existing OAuth connections may need to reconnect to grant `BoldSign.Users.Read` before calling `list_users`.
- The EU API endpoint is `https://api-eu.boldsign.com`.


## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
