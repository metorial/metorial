# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1

Work across Gmail, Google Drive, Drive-backed Google Docs and Sheets operations,
and Google Chat through one Google OAuth connection. The integration provides 57
tools for mail and contacts, files and collaboration, native Docs import and
discovery, spreadsheet deletion, and Chat conversations.

## Included tools

| Google product | Tools |
| --- | ---: |
| Gmail | 16 |
| Google Drive | 25 |
| Google Docs | 3 |
| Google Sheets | 1 |
| Google Chat | 12 |
| **Total** | **57** |

The two products that expose `search_messages` use distinct public keys:
`gmail_search_messages` and `chat_search_messages`. Gmail's `get_attachment`
remains available under its original key.

Google Docs contributes `create_document_markdown`, `update_document_markdown`,
and `list_documents`; Google Sheets contributes `delete_spreadsheet`. These
operations use the Drive API and are covered by the integration's existing full
Google Drive access.

Google Meet is not part of this integration. Meet tools live in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2
together with Google Calendar, because Meet requests no restricted scope.

## Authentication

The integration uses one Google OAuth method that requests the complete
restricted-scope project declaration: 41 scopes covering Gmail, Google Drive,
Google Chat, Google Contacts (read-only), and basic account email/profile
access. Some of those scopes back planned tools and are requested now so the
consent screen matches the verified project declaration.

## Tools not included

| Google product | Source tool | Reason |
| --- | --- | --- |
| Google Docs | `create_document` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Docs | `get_document` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Docs | `edit_document` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Docs | `merge_template` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Docs | `manage_named_ranges` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `create_spreadsheet` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `get_spreadsheet` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `update_spreadsheet` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `read_cells` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `write_cells` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `clear_cells` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `manage_sheets` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `format_cells` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `create_chart` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `create_pivot_table` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `set_data_validation` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `manage_protected_ranges` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `create_filter_view` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `merge_cells` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2. |
| Google Sheets | `batch_update` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2 as `sheets_batch_update`. |
| Google Sheets | `manage_named_ranges` | Remains available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2 as `sheets_manage_named_ranges`. |
| Google Chat | `get_attachment` | This operation is service-account-only and requires the `chat.bot` scope, which is outside this user OAuth integration. Use `download_attachment` for uploads available to the connected user. |

## Configuration

- `userId` defaults to `me` for Gmail. A full email address can be used for
  delegated access.
- `defaultSpace` is optional and supplies a default `spaces/{space}` resource
  for Google Chat operations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
