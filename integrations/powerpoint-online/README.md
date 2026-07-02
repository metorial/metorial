# <img src="https://provider-logos.metorial-cdn.com/powerpoint-online.png" height="20"> Powerpoint Online

Manage PowerPoint presentations stored in OneDrive and SharePoint via Microsoft Graph API. Upload, download, copy, move, and delete .pptx files. Convert presentations to PDF format. Share files by creating sharing links or granting direct permissions with configurable roles. Retrieve and update file metadata, access version history, restore previous versions, and generate slide thumbnails and embeddable previews. Search for presentations across OneDrive and SharePoint. Subscribe to webhook notifications for file creation, update, and deletion events within monitored folders. Note: does not support direct manipulation of individual slides, shapes, or text content within presentations.

## Tools

### Create Folder

Create a new folder in OneDrive or SharePoint. Useful for organizing presentations into directories before uploading.

### Delete File

Permanently delete a file or folder from OneDrive or SharePoint. Deleted items are moved to the recycle bin and can be recovered within the retention period.

### Download Presentation

Get a download URL for a PowerPoint presentation from OneDrive or SharePoint. Optionally convert the presentation to PDF format on the server side.

### Get Presentation

Retrieve metadata and properties of a PowerPoint presentation stored in OneDrive or SharePoint. Returns file name, size, timestamps, parent folder info, and web URL. Locate a file by its unique ID or by its path.

### Get Thumbnails

Retrieve thumbnail images for each page/slide of a PowerPoint presentation. Returns URLs for small, medium, and large thumbnails per slide. Also supports generating an embeddable preview URL for the presentation.

### List Files

List files and folders inside a specific folder in OneDrive or SharePoint. Supports pagination. If no folder is specified, lists items in the drive root.

### Manage Permissions

List or revoke sharing permissions on a file in OneDrive or SharePoint. Use "list" to see all current permissions, or "revoke" to remove a specific permission by its ID.

### Move or Copy File

Move or copy a file or folder to a new location within OneDrive or SharePoint. Can also be used to rename a file without moving it. Copy operations are asynchronous and return a monitor URL.

### Search Files

Search for files including PowerPoint presentations across OneDrive or SharePoint by keyword. Returns matching files with metadata. Searches file names and content.

### Share File

Share a PowerPoint presentation or other file by creating a sharing link or inviting specific users. Supports view-only, edit, and embed link types with configurable scope. Can also invite users directly with specified roles.

### Update File Metadata

Update the name or description of a file or folder in OneDrive or SharePoint. Use this to rename presentations or update their descriptions.

### Upload Presentation

Upload a PowerPoint presentation file to OneDrive or SharePoint. For small files (< 4MB), provide base64-encoded file content directly. For large files, use the **createUploadSession** mode to get an upload URL for chunked uploads.

### Version History

List previous versions of a file or restore a specific version. View the complete version history including who made changes and when. Restoring a version creates a new version with the content of the selected version.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
