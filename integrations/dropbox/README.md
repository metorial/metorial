# <img src="https://provider-logos.metorial-cdn.com/dropbox.svg" height="20"> Dropbox

Upload, download, and manage files and folders in Dropbox cloud storage. Create, move, copy, and delete files and folders. Search files by name or content. Share files and folders via shared links with configurable access settings. Manage shared folder members and permissions. Create and manage file requests for document collection. Assign custom metadata properties to files and folders. View and restore file revisions. Retrieve user account information including storage quota. Administer Dropbox Business teams: add, remove, suspend, and update team members and groups. Create and manage team folders. Access team audit logs for change tracking. Receive webhook notifications for file changes.

## Tools

### Create Folder

Create a new folder at the specified path. Supports autorename to avoid conflicts if a folder with the same name already exists.

### Delete File or Folder

Permanently delete a file or folder at the specified path. This action cannot be undone.

### Download File

Download a file's content from Dropbox. Returns the file content as text along with its metadata. Suitable for text-based files.

### File Revisions

List or restore previous versions of a file. Use action "list" to see available revisions or "restore" to revert a file to a specific revision.

### Get Account Info

Retrieve the current user's Dropbox account information including name, email, storage quota, and account type. Optionally look up another user by account ID.

### Get File or Folder Metadata

Retrieve detailed metadata for a file or folder at a given path or by ID. Returns type, size, modification dates, revision, sharing status, and media info where available.

### List Folder

List files and folders in a Dropbox directory. Supports recursive listing and pagination via cursor. Use path "/" or "" for the root directory.

### Manage File Request

Create, list, update, or delete Dropbox file requests. File requests allow others to upload files to your Dropbox. Use action "create" to make a new request, "list" to see all requests, "get" for a specific request, "update" to modify, or "delete" to remove requests.

### Manage Shared Link

Create, list, or revoke shared links for files and folders. Use action "create" to generate a new shared link, "list" to find existing links, or "revoke" to remove a link.

### Move or Copy File/Folder

Move or copy a file or folder from one path to another. Choose "move" to relocate or "copy" to duplicate. Supports autorename to avoid conflicts.

### Search Files

Search for files and folders in Dropbox by name or content. Returns matching entries with relevance info. Optionally filter by path or file category.

### Share Folder

Share a folder with other users or manage shared folder membership. Use action "share" to make a folder shared, "add_member" to invite someone, "remove_member" to remove access, or "list_members" to see current members.

### Upload File

Upload a text file to Dropbox at the specified path. Supports creating new files, overwriting existing files, or appending with autorename. Best for small text-based files (up to 150 MB).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
