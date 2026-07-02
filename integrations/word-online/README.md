# <img src="https://provider-logos.metorial-cdn.com/workspace.png" height="20"> Word Online

Manage Word documents stored in OneDrive and SharePoint via Microsoft Graph. Upload, download, create, copy, move, rename, and delete Word documents. Convert documents to PDF. Share documents with view or edit permissions via links or user invitations. Retrieve version history and restore previous versions. Check in and check out documents to control editing access. Search for documents by name, content, or metadata. Generate document previews and thumbnails. Subscribe to webhook-based change notifications for file updates in drive folders.

## Tools

### Create Folder

Create a new folder in OneDrive or SharePoint. Specify a parent folder ID to create a nested folder, or omit it to create at the drive root. If a folder with the same name already exists, the new folder will be automatically renamed.

### Create Upload Session

Create a resumable upload session for uploading large files (>4MB) to OneDrive or SharePoint. Returns an upload URL that accepts byte range uploads. Use this for large Word documents or other files that exceed the 4MB direct upload limit.

### Check In/Out Document

Check in or check out a Word document in OneDrive for Business or SharePoint. **Check out** locks the document to prevent others from editing it. **Check in** unlocks the document and makes your changes visible to others.

### Document Preview

Get a short-lived embeddable preview URL for a Word document stored in SharePoint or OneDrive for Business. The returned URL can be embedded in an iframe to display a temporary read-only preview of the document.

### Document Versions

List or restore previous versions of a Word document in OneDrive or SharePoint. By default, lists all available versions. Optionally, provide a version ID to restore the document to that specific version.

### Download Document

Get a pre-authenticated download URL for a Word document or file stored in OneDrive or SharePoint. The returned URL can be used to download the file content directly. Optionally convert the document to PDF format.

### Get Document

Retrieve metadata and details for a Word document or file stored in OneDrive or SharePoint. Look up a document by its item ID or by its full path within the drive. Returns file metadata including name, size, URLs, and modification history.

### List Documents

List files and folders within a specific folder in OneDrive or SharePoint. If no folder ID is provided, lists items at the drive root. Returns all child items with their metadata.

### List Permissions

List all sharing permissions on a Word document or file in OneDrive or SharePoint. Returns all permissions including sharing links and direct user grants. Optionally remove a specific permission.

### Manage Document

Perform file management operations on a Word document or file in OneDrive or SharePoint. Supports **renaming**, **moving** to a different folder, **copying**, and **deleting** files. Specify the desired action and provide the relevant parameters.

### Remove Permission

Remove a sharing permission from a Word document or file in OneDrive or SharePoint. Revokes a specific sharing link or user invitation by its permission ID.

### Search Documents

Search for Word documents and files across OneDrive or SharePoint by name, content, or metadata. Uses Microsoft Graph's search to find matching files.

### Share Document

Share a Word document or file by creating a sharing link or inviting specific users. Supports creating **view-only** or **edit** sharing links, and sending sharing invitations to specific email addresses with custom messages.

### Upload Document

Upload or create a new document in OneDrive or SharePoint. Supports small file uploads by providing content directly. Specify the target location by either a parent folder ID or folder path, along with the desired file name. For large files, use the **Create Upload Session** tool instead.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
