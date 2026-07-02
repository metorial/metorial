Now let me get the webhook details and the full scope list:Now let me get the full scopes list from the auth page:Now I have enough information to compile the specification. Let me also check the Events API (which is different from webhooks):Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Egnyte

## Overview

Egnyte is a cloud content management and governance platform that provides secure file storage, sharing, and collaboration for businesses. It offers hybrid architecture supporting both cloud and on-premises storage, with content intelligence, data governance (Secure & Govern), and workflow automation capabilities. The platform is tenant-based, where each organization has its own domain (e.g., `{company}.egnyte.com`).

## Authentication

Egnyte APIs use OAuth 2.0. The API key (also known as `client_id`) identifies the application, and the access token (`access_token`) is generated for a particular user via the OAuth flow.

**Prerequisites:**

- Register for a developer account at `https://developers.egnyte.com` and create an application. A key will be generated for each application automatically but will need to be approved before you can use it.
- The API key must be associated with the domain name you wish to connect to.
- The user must provide their **Egnyte domain** (the `{company}` part of `{company}.egnyte.com`), which is required for all API calls.

**Supported OAuth 2.0 Flows:**

1. **Authorization Code Flow** (recommended for third-party/public apps):
   - For partners developing applications for use by customers, the Authorization Code flow is a general-purpose and secure way of getting tokens stored in the backend.
   - Authorization URL: `https://{domain}.egnyte.com/puboauth/token`
   - Token exchange URL: `https://{domain}.egnyte.com/puboauth/token`
   - Required parameters: `client_id`, `client_secret`, `redirect_uri`, `code`, `grant_type=authorization_code`

2. **Enhanced Auth Service (Code Auth Flow Proxy)** — useful when you don't know the user's domain upfront:
   - This OAuth flow enhances the Authorization Code Flow. The OAuth Flow Proxy does not require knowing the user's Egnyte domain before initiating the flow. The user will be prompted to provide a domain name in the first step of the flow.
   - Services are available in two regions, Europe and the United States.

3. **Implicit Grant Flow** (browser-only apps):
   - Implicit Grant flow is a less secure version of OAuth2. Only usable for integrations that are limited to just JavaScript code in the browser and have no back-end.

4. **Resource Owner Password Credentials Flow** (internal applications only):
   - For Egnyte customers developing an application for internal use, using the OAuth 2.0 Resource Owner flow.
   - Requires `client_id`, `client_secret`, `username`, `password`, and `grant_type=password`.

**Tokens:**

- Bearer access tokens expire in 30 days.
- If a user changes their password or explicitly revokes access, a new token will be required. Your app must be able to use the refresh token to obtain a new pair of access and refresh tokens.

**Scopes:**

- By default, any OAuth token created will be permitted to access all available Egnyte APIs. You should restrict a given token to a subset of APIs by passing the scope parameter.
- Scopes must be space-delimited. Example: `Egnyte.filesystem Egnyte.link`
- Available scopes include: `Egnyte.filesystem`, `Egnyte.link`, `Egnyte.user`, `Egnyte.permission`, `Egnyte.audit`, `Egnyte.bookmark`, `Egnyte.projectfolders`
- Without specifying scopes, the application will be able to: Read, write and delete files/folders; Create, update and delete users; Generate audit reports; Create and delete file/folder links; Add, update, delete and report on folder permissions.

**Custom Input Required:** The user's **Egnyte domain** (subdomain) is required. When accessing the Public API you must use `{Egnyte Domain}.egnyte.com` (e.g., `mycompany.egnyte.com`) and not a custom access URL.

## Features

### File System Management

Upload, download, create, copy, move, and delete files and folders. Supports listing folder contents, retrieving file metadata, managing file versions, and locking/unlocking files. Files and folders can be referenced by path or by persistent IDs (group_id for files, folder_id for folders).

### Sharing Links

Create and manage file and folder links for sharing content. Links can be customized with click or date-based expiry, login requirements, notification on access, and more.

### Permissions Management

List, set, and remove folder permissions for users and groups. Permission levels include Owner, Full, Editor, and Viewer. Supports checking effective permissions for a specific user on a folder.

### User Management

Create, update, get information about, and delete users. Customize settings like user role or authentication type and control whether a new user receives an invitation email. This API adheres to the SCIM standard for user management.

### Group Management

Create, edit, and delete groups. Inspect and manage group membership.

### Search

Search for content stored in Egnyte based on filenames, metadata, and content.

### Workflows

Create new workflows, list tasks and workflows, and cancel workflows. Workflows support review and approval steps on files, with assignees, due dates, and optional signature requirements. Supports outbound webhook tasks with completion signals.

### Audit Reporting

Programmatically generate and retrieve reports on login activity, file actions, and permission changes, giving a 360° view of the activity in your account. Available in two versions: V1 (report-based with custom time ranges) and V2 (streaming version using cursors for near real-time retrieval of audit events for the last 7 days).

### Trash Management

Move files and folders to the trash, permanently delete items in the trash, empty the trash, and restore items from the trash.

### Comments

Add, retrieve, and delete comments (notes) on files.

### Metadata

Add, update, delete, and query custom metadata key-value pairs on files and folders.

### Bookmarks

Manage bookmarks to files and folders.

### AI Features

Access AI features such as asking questions about documents, generating document summaries, interacting with Egnyte Copilot, and querying Knowledge Bases. The Copilot provides AI-driven responses based on global content within the Egnyte domain. Users can optionally specify particular files/folders to limit the context.

### Egnyte Sign

Electronic signature capabilities for documents.

### Project Folders

Manage project folder structures and related project activities.

### Secure & Govern (Protect)

Exposes data governance issues for listing, polling for new issues, and watching for changes in the issue pool. Includes legal hold management and subject access requests. Uses a separate OAuth flow and API endpoint (`egnyteprotect.com`).

## Events

Egnyte supports **webhooks** for real-time event notifications on the Collaborate (Connect) platform.

### File System Events

Notifications for file and folder operations: file added, folder added, file/folder copied, file/folder moved, file/folder deleted, file deleted from trash, file restored from trash, file locked, file unlocked, upload via link, and project folder activity. Can be scoped to specific paths (up to 100 comma-separated paths).

### Link Events

Notifications for link lifecycle: link created (including download link and upload link variants), and link deleted (including download link and upload link variants).

### Comment Events

Notifications when comments are added or removed on files.

### Metadata Events

Notifications when metadata keys are added to or deleted from files/folders.

### Permission Events

Notifications when permissions on folders are changed.

### Workflow Events

Notifications for workflow lifecycle: workflow created, workflow completed, approval task approved, approval task rejected.

### Group Events

Notifications for group management: group created, group deleted, group renamed, members added/removed, owners added/removed.

**Configuration options:**

- Webhooks can be filtered by event type using wildcards (e.g., `fs:*` for all file system events) or specific events (e.g., `fs:add_file`).
- Webhooks can be scoped to specific folder paths.
- A custom authorization header can be provided for webhook delivery verification.
- There is a limit of 10 webhooks for Connect and 2 for Protect per domain.
