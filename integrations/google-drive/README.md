# <img src="https://provider-logos.metorial-cdn.com/google-drive.svg" height="20"> Google Drive

Upload, download, create, copy, move, rename, trash, and permanently delete files and folders in Google Drive. Search for files using complex queries filtering by name, MIME type, owner, modification date, labels, and other metadata. Share files and folders with specific users, groups, or domains with role-based permissions (owner, writer, commenter, reader). Manage shared drives and their members. Export Google Workspace files (Docs, Sheets, Slides) to standard formats like PDF, DOCX, and XLSX. Track file revision history and restore earlier versions. Create, read, update, and delete threaded comments and replies on files. Apply and read custom labels on files. Monitor file and folder changes via push notifications or webhook subscriptions. Store app-specific data in a hidden per-user folder.

## Tools

### Copy File

Create a copy of an existing file in Google Drive. Optionally provide a new name and destination folder for the copy.

### Create File or Folder

Create a new file or folder in Google Drive. To create a folder, set \

### Delete File

Permanently delete a file or folder from Google Drive. This action is irreversible. To move a file to trash instead (recoverable), use the **Update File** tool with \

### Download File

Download the content of a file from Google Drive. For regular files (PDFs, images, text files, etc.), downloads the file content directly. For Google Workspace files (Docs, Sheets, Slides), use the **Export File** tool instead to convert to a standard format.

### Export File

Export a Google Workspace file (Docs, Sheets, Slides, Drawings) to a standard format such as PDF, DOCX, XLSX, CSV, or plain text. Only works with Google Workspace native formats — for regular files use the **Download File** tool.

### Get File

Retrieve detailed metadata for a specific file or folder by its ID. Returns comprehensive information including name, MIME type, size, ownership, timestamps, sharing status, and links.

### List Comments

List all comments on a file, including threaded replies. Shows comment content, author, timestamps, and resolution status.

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
