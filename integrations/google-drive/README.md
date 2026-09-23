# <img src="https://provider-logos.metorial-cdn.com/google-drive.svg" height="20"> Google Drive

Upload, download, create, copy, move, rename, trash, and permanently delete files and folders in Google Drive. Search for files using complex queries filtering by name, MIME type, owner, modification date, labels, and other metadata. Share files and folders with specific users, groups, or domains with role-based permissions (owner, writer, commenter, reader). Manage shared drives and their members. Export Google Workspace files (Docs, Sheets, Slides) to standard formats like PDF, DOCX, and XLSX. Track file revision history and restore earlier versions. Create, read, update, and delete threaded comments and replies on files. Read label definitions and search files by label. Browse the Drive apps installed for your account. Monitor recently modified files with periodic checks. Store app-specific data in a hidden per-user folder.

## Authentication

Use **OAuth** for Drive access and to read the label definitions your organization makes available to you, including unpublished revisions of labels you can edit. Label definitions are read-only through this connection.

## Events

Enable **Recent File Activity** to check files every 15 minutes. Each check searches a 30-minute modification window across My Drive files and shared-drive files the connected user has accessed. It emits `file.recently_modified` with the file ID, name, MIME type, current trash state, modification time, and available parent, link, and last-modifier details. For example, a file may produce `{"fileId":"abc123","fileName":"Plan","mimeType":"application/vnd.google-apps.document","trashed":false,"modifiedTime":"2026-09-23T10:00:00.000Z"}`.

The event ID and deduplication key combine the file ID, modification time, and current trash state. This is a recent-file snapshot, so it cannot report permanent deletions, loss of access, or when a file was moved to trash. It does not scan every file in every shared drive, and changes during an extended polling outage may fall outside the window. For complete change history, use **List Changes** with a saved page token. See [Drive shared-drive search](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives), [Drive file search](https://developers.google.com/workspace/drive/api/guides/ref-search-terms), and [Drive changes](https://developers.google.com/workspace/drive/api/guides/manage-changes).

## Tools

### Copy File

Create a copy of an existing file in Google Drive. Optionally provide a new name and destination folder for the copy.

### Create File or Folder

Create a new file or folder in Google Drive. To create a folder, set \

### Delete File

Permanently delete a file or folder from Google Drive. This action is irreversible. To move a file to trash instead (recoverable), use the **Update File** tool with \

### Get Download URL

Get a downloadable file from Google Drive using the connected account’s access. The result also includes a browser download URL for use while signed into a Google account with access to the file. For Google Workspace files (Docs, Sheets, Slides), use the **Export File** tool instead to convert to a standard format.

### Export File

Export a Google Workspace file (Docs, Sheets, Slides, Drawings) to a standard format such as PDF, DOCX, XLSX, CSV, or plain text. Only works with Google Workspace native formats — for regular files use the **Get Download URL** tool.

### Get Drive App

Get details about one Google Drive app by ID, including the file types it opens, whether it is installed and authorized, and its open and create URL templates.

### Get Drive Label

Get one Google Drive label definition by ID or resource name, including its fields, selection choices, lifecycle state, and what you can do with it. Append `@published`, `@latest`, or `@{revisionId}` to read a specific revision.

### Get File

Retrieve detailed metadata for a specific file or folder by its ID. Returns comprehensive information including name, MIME type, size, ownership, timestamps, sharing status, and links.

### List Comments

List all comments on a file, including threaded replies. Shows comment content, author, timestamps, and resolution status.

### List Drive Apps

List the Google Drive apps installed for your account, including the file types each app opens. Optionally filter by file extension or MIME type.

### List Drive Labels

List the Google Drive label definitions you can see, including each label's fields and selection choices. Use the returned field query keys in a Drive search query to find files by label.

### List Permissions

List all permissions (sharing settings) for a file or folder. Shows who has access and their role (owner, writer, commenter, reader).

### List Revisions

List the revision history of a file. Shows all saved versions with timestamps, who modified them, and file sizes.

### List Shared Drives

List all shared drives the authenticated user has access to. Optionally filter by name query.

### Search Files

Search for files and folders in Google Drive using queries. Supports filtering by name, MIME type, parent folder, ownership, modification date, shared status, and trashed state. Use the \

### Update File

Update a file or folder's metadata in Google Drive. Can rename, change description, star/unstar, trash/restore, or move between folders. To move a file, specify both \

### Upload File

Upload a file with content to Google Drive. Provide file content as plain text or base64-encoded string. The file will be created with the given name, content type, and optional parent folder.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
