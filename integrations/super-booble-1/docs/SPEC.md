# Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1 specification

## Overview

Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1 combines Gmail, Google Drive, Drive-backed operations from Google
Docs and Google Sheets, and Google Chat behind one Google OAuth connection. It
exposes the existing source-tool contracts and does not expose source triggers.
It is the restricted-scope (P1) verification project: every source whose
consent list contains a Google-restricted Gmail, Drive, or Chat scope lives
here. Google Meet requests no restricted scope and belongs to Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2.

## Authentication

The integration uses one OAuth 2.0 method. Authorization requests offline
access and explicit consent so a refresh token can be stored. Token refresh
preserves the current refresh token when Google does not issue a replacement.
The connected-account profile comes from Google's userinfo endpoint.

The OAuth method requests the complete P1 Google Cloud project declaration, in
Console order: 14 Google-restricted scopes followed by 27 sensitive or
non-sensitive scopes (41 in total). The consent screen therefore matches the
Data Access declaration exactly, and the verification review covers every
scope the connection will ever ask for.

Restricted: `https://mail.google.com/`, `gmail.readonly`, `gmail.compose`,
`gmail.insert`, `gmail.modify`, `gmail.settings.basic`,
`gmail.settings.sharing`, `drive`, `drive.readonly`, `drive.metadata`,
`drive.metadata.readonly`, `chat.messages`, `chat.messages.readonly`,
`chat.delete`. `chat.import` is not declared: the Console rejects it as an
invalid user OAuth scope (it is an import-mode-only grant), so Chat import-mode
migration is out of scope for this connection.

Sensitive / non-sensitive: `gmail.send`, `gmail.labels`, `contacts.readonly`,
`contacts.other.readonly`, `drive.file`, `drive.appdata`,
`drive.photos.readonly`, `drive.apps.readonly`, `drive.labels`,
`drive.labels.readonly`, `chat.messages.create`, `chat.messages.reactions`,
`chat.spaces`, `chat.spaces.readonly`, `chat.memberships`,
`chat.memberships.readonly`, `chat.memberships.app`, `chat.customemojis`,
`chat.customemojis.readonly`, `chat.users.sections`,
`chat.users.sections.readonly`, `chat.users.readstate`,
`chat.users.readstate.readonly`, `chat.users.spacesettings`,
`chat.admin.spaces.readonly`, `userinfo.email`, `userinfo.profile`.

Every retained tool is satisfied by this grant. The three included Google Docs
tools and the included Google Sheets deletion tool use the Drive API and are
covered by `drive`. `chat.delete` backs Chat space deletion. Fourteen of the
requested scopes back planned tools and are referenced by no retained tool
clause yet (`gmail.insert`, `gmail.settings.sharing`,
`contacts.other.readonly`, `chat.admin.spaces.readonly`, the
Chat custom emoji / sidebar sections / read state / notification settings
grants, and the Drive apps/labels grants); they are tracked in
`superGoogle1FutureToolScopes` and the contract test fails if a declared
scope is neither used by a tool nor listed there. No `meetings.space.*` or
`drive.meet.readonly` scope is declared in this project.

## Tool inventory

The source providers contain 79 tools: Gmail 16, Drive 25, Docs 8, Sheets 17,
and Chat 13. This integration exposes 57.

Collision aliases:

| Source | Source key | Exposed key |
| --- | --- | --- |
| Gmail | `search_messages` | `gmail_search_messages` |
| Google Chat | `search_messages` | `chat_search_messages` |

Explicit omission:

| Source | Source key | Reason |
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
| Google Chat | `get_attachment` | The source operation is restricted to service-account authentication and requires `chat.bot`, which is not part of this aggregate user OAuth method. |

Google Docs' `create_document_markdown`, `update_document_markdown`, and
`list_documents` tools and Google Sheets' `delete_spreadsheet` tool remain
included because their existing handlers operate through Google Drive.
Google Chat's user-authorized `download_attachment` and `upload_attachment`
tools remain included. Gmail's distinct `get_attachment` tool also remains
included.

## Configuration

`userId` is optional in connection configuration and defaults to `me`.
`defaultSpace` is optional and, when supplied, must be a non-empty Google Chat
space ID or resource name. No opaque provider resource ID is required during
connection setup.
