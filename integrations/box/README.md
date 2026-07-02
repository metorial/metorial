# <img src="https://provider-logos.metorial-cdn.com/box.svg" height="20"> Box

Upload, download, copy, move, rename, lock, and delete files and folders in Box. Manage file versions, shared links, and collaborations with configurable roles. Search content by full text, metadata, file type, and date ranges. Create and manage e-signature requests via Box Sign. Apply custom metadata templates to files and folders. Add comments and task assignments to files. Generate documents from templates with merged data. Use Box AI to ask questions about file content, generate text, and extract structured data. Manage enterprise users, groups, retention policies, legal holds, and security classifications. Monitor file, folder, collaboration, comment, shared link, metadata, task, sign request, and document generation events via webhooks.

## Tools

### Get Download URL

Get a temporary download URL for a Box file. The URL can be used to download the file content directly.

### Get File Info

Retrieve detailed information about a file in Box, including its name, size, owner, timestamps, parent folder, shared links, and version history.

### List Folder Items

List the files, folders, and web links contained within a Box folder. Returns item metadata including names, types, sizes, and modification dates. Supports pagination.

### List Users

List enterprise users in Box, optionally filtering by name or login. Can also retrieve the current authenticated user's details.

### Manage Collaboration

Create, update, or remove collaborations on Box files and folders. Invite users or groups with specific roles (editor, viewer, co-owner, etc.), update collaboration roles, or remove collaborators.

### Manage Comments

Add, list, update, or delete comments on a Box file. Use tagged messages to @mention users in comments.

### Manage File

Perform operations on an existing Box file: rename, move to another folder, copy, lock/unlock, update description, or delete. Specify the desired action and relevant parameters.

### Manage Folder

Create, rename, move, copy, or delete a Box folder. For creating a new folder, provide the parent folder ID and name. For other operations, provide the folder ID and relevant parameters.

### Manage Metadata

Apply, view, update, or remove metadata on Box files. Metadata is based on templates that define typed fields. You can also list available metadata templates.

### Manage Shared Link

Create, update, or remove shared links on Box files and folders. Configure access levels (open, company, collaborators), optional passwords, and expiration dates.

### Manage Sign Request

Create, view, list, or cancel Box Sign e-signature requests. Send documents for signature to one or more signers with configurable options.

### Manage Tasks

Create, list, update, or delete tasks on Box files. Tasks can be assigned to specific users with due dates and completion tracking. Supports review and approval task types.

### Manage Web Link

Create, view, update, or delete web link bookmarks within Box folders. Web links are bookmarks to external URLs stored alongside files and folders.

### Search Content

Full-text search across all Box content accessible to the authenticated user. Filter results by file type, date ranges, ancestor folders, content type, and owner. Returns matching files and folders with key metadata.

### Upload File

Upload a new file to a Box folder. Provide the file name, target folder, and text content. Best suited for text-based files.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
