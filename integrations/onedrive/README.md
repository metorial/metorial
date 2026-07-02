# <img src="https://provider-logos.metorial-cdn.com/one-drive.svg" height="20"> Onedrive

Upload, download, create, copy, move, rename, and delete files and folders in OneDrive and SharePoint document libraries. Share files and folders via sharing links or permission grants. Search for files by name, content, or metadata. Manage drives and access storage quota information. Track file and folder changes over time using delta queries. Subscribe to webhooks for drive change notifications. Access file previews, thumbnails, and rich metadata for photos, audio, and video. Supports resumable uploads for large files up to 250 GB and PDF conversion on download.

## Tools

### Copy File or Folder

Copies a file or folder to a new location in OneDrive or SharePoint. The copy is performed asynchronously by Microsoft Graph; a monitor URL is returned to track the operation status. Optionally rename the copy.

### Create Folder

Creates a new folder in OneDrive or SharePoint. The parent location can be specified by folder ID or path.

### Create Upload Session

Creates a resumable upload session for uploading large files (up to 250 GB) to OneDrive or SharePoint. Returns an upload URL that accepts byte range PUT requests. Use this for files larger than 4 MB.

### Delete File or Folder

Permanently deletes a file or folder from OneDrive or SharePoint. Deleted items may be moved to the recycle bin depending on the drive configuration.

### Get Download URL

Retrieves a pre-authenticated, short-lived download URL for a file in OneDrive or SharePoint. Supports optional format conversion (e.g., convert to PDF). The URL can be used directly to download the file content.

### Get File or Folder

Retrieves detailed metadata for a specific file or folder in OneDrive or SharePoint, including size, timestamps, permissions summary, and media-specific metadata (photo, audio, video). Items can be addressed by ID or path.

### List Drives

Retrieves all available drives for the authenticated user, including their personal OneDrive and any shared drives or SharePoint document libraries they have access to. Returns drive metadata including storage quota information.

### List Files & Folders

Lists files and folders within a specific folder in OneDrive or a SharePoint document library. Supports pagination, filtering, and sorting. Items can be addressed by folder ID or by path.

### Manage Permissions

Lists or removes permissions on a file or folder in OneDrive or SharePoint. Use "list" action to see all sharing permissions and links, or "remove" to revoke a specific permission.

### Move or Rename Item

Moves a file or folder to a new location and/or renames it. Can move items between folders or across drives in OneDrive/SharePoint. Provide a new parent folder to move, a new name to rename, or both.

### Search Files

Searches for files and folders in OneDrive or SharePoint by name, content, or metadata. Results include items from the user's own drive as well as items shared with them.

### Share File or Folder

Creates a sharing link or sends sharing invitations for a file or folder in OneDrive or SharePoint. Can create anonymous, organization-wide, or user-specific links with read or edit access. Can also invite specific users by email.

### Upload File

Uploads a file to OneDrive or SharePoint. Supports simple upload for text/small content. For large file uploads, use the "Create Upload Session" tool instead. The destination can be specified by parent folder ID or path.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
