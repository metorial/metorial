Now let me get the REST API authentication details and webhook trigger types:Now I have comprehensive information about Files.com. Let me compose the specification.

# Slates Specification for Files.com

## Overview

Files.com is a cloud-native managed file transfer (MFT) and SFTP platform that provides secure file storage, sharing, transfer, and automation. It supports multiple protocols (SFTP, FTP, FTPS, AS2, WebDAV, HTTPS) and offers 50+ native connectors to cloud storage providers like AWS S3, Azure, Google Cloud, SharePoint, and Google Drive. The platform unifies file operations, user management, permissions, automations, and audit logging under a single API-first architecture.

## Authentication

Files.com supports two authentication methods for API access:

### 1. API Key Authentication (Recommended)

There are two ways to authenticate: API Key authentication and Session-based authentication. Authenticating with an API key is the recommended authentication method for most scenarios.

- Files.com supports two types of API keys: **Site-wide keys** and **User keys**. Site-wide keys provide full access to the entire API, while user keys provide access based on the permissions of the associated user.
- API keys can be generated from the Files.com web interface or via the API itself.
- When the key is first created, you will have access to the key value. You can never retrieve the key value again, so be sure to store the value immediately.
- When using a user-specific API key, if the user is an administrator, you will have full access to the entire API. If the user is not an administrator, you will only be able to access files that user can access, and no access will be granted to site administration functions in the API.
- The API key is passed as a header or parameter with each request.

**Base URL:** `https://app.files.com` (default) or `https://SUBDOMAIN.files.com` if your site has a custom subdomain and has global acceleration disabled.

### 2. Session-based Authentication

To create a session, the create method is called on the Session object with the user's username and password. This returns a session object that can be used to authenticate SDK method calls.

- If the user is an administrator, the session will have full access to all capabilities of Files.com. Sessions created from regular user accounts will only be able to access files that user can access, and no access will be granted to site administration functions.
- Sessions use the exact same session timeout settings as web interface sessions. When a session times out, simply create a new session and resume where you left off.
- Sessions are created by POSTing to the session endpoint with `username` and `password`. The returned session ID is then used for subsequent requests.

## Features

### File and Folder Management

Upload, download, list, copy, move, delete, and preview files and folders. The API provides 100% feature coverage across files, folders, users, groups, permissions, automations, logs, remote servers, exports, and more. Paths are case-insensitive and support Unicode NFC normalization.

### User and Group Management

Create, update, delete, and list users and groups. Manage user authentication methods (password, SSO, API keys, SSH keys), assign permissions, set access expiration dates, and configure two-factor authentication. Automated provisioning allows external identity systems and automation platforms to create and manage users automatically. Identity providers can synchronize users and groups through SCIM provisioning or create accounts during login through Just-in-Time (JIT) provisioning. Supports delegated administration via Group Admins and Partner Admins.

### Permissions Management

Set and manage folder-level permissions for users and groups. Supports role-based access control with configurable permission levels (read, write, admin, history). Permissions can be assigned per folder and inherited by subfolders.

### Share Links (Bundles)

A Bundle is the API/SDK term for the feature called Share Links in the web interface. Create, configure, and manage secure share links for files and folders. Options include password protection, expiration dates, download limits, watermarking, and requiring registration for access.

### Remote Server Connections

Connect external storage systems as remote servers, including AWS S3, Azure Blob Storage, Azure Files, Google Cloud Storage, Google Drive, SharePoint, Box, Dropbox, and servers using SFTP, FTP, FTPS, and WebDAV protocols. Remote servers can be integrated as:

- **Mounts**: Real-time pass-through access to remote file systems as Files.com folders.
- **Syncs**: Scheduled push or pull replication between Files.com and remote systems.

### Automations and Workflows

Files.com Automations automate file actions such as Create Folders, Copy Files, Move Files, Import Files, Delete Files, and Run Sync.

- **Triggers**: File events (when a file is created, modified, or deleted), uploads (via SFTP, HTTPS, API, AS2, WebDAV, and more), inbound webhooks, schedules (hourly, daily, or custom cron-like intervals), and manual/API invocation.
- **Actions**: Create folders, copy files, move files, import files, delete files, and run syncs. Supports wildcard patterns, multiple destinations, and date/time tokens in destination paths.
- Automations can operate across folders using wildcard paths and can target remote server destinations.

### Notifications

Notifications let you react to Files.com activity by sending messages or events to other tools. Use them when you need awareness, an audit trail, or automation outside Files.com without polling. Choose the notification feature that best meets your needs, as each offers unique capabilities. Notification destinations include email, webhooks, Slack, Microsoft Teams, and Amazon SNS.

### Logging and History

Access detailed audit logs for all activity including file operations, API requests, SFTP/FTP/WebDAV sessions, automation runs, sync operations, outbound emails, and webhook deliveries. Webhook logs are retained indefinitely as long as the site remains active.

### Site Administration

Manage site-level settings, branding, security policies (password requirements, IP whitelisting, 2FA enforcement), SSO configuration (SAML, OAuth), and billing through the API.

### API Key Management

An API key is an authentication credential that can be used with the Files.com API and SDKs. This API (and SDKs) can be used for integrating Files.com with your own applications. API keys are independent from one another, and are easily disposable. By generating unique API keys for each of your applications or servers, you can easily revoke them if needed without disrupting your other integrations.

## Events

Files.com supports outbound webhooks that can notify external systems when file activity occurs.

### File Activity Webhooks

Webhooks are helpful for notifying external systems when folder contents change in your Files.com account. In addition to sending a message that particular file event happened, you can also configure a Files.com webhook to send the contents of the file to the webhook listener.

- Webhook alerts can be sent to any URL, filtered by file type (like .pdf) or specific file events (Create, Read, Update, Delete, Move, Copy).
- Webhooks can be scoped to specific folders or applied site-wide.
- A webhook that applies to your entire site can only trigger on file activity that occurs within the Files.com system. File changes that occur directly on an attached Remote Server, even in a folder that is a Remote Server Mount, won't trigger webhooks.
- **Configuration options**:
  - Filter by specific file action types (upload, download, delete, copy, move).
  - Trigger when specified file name patterns are matched using globbing syntax. Multiple patterns can be specified.
  - Exclude certain files from triggering by using exclusion patterns. By default, no files are excluded.
  - The Method setting controls how the webhook request is sent — either GET or POST.
  - Custom headers can be defined to be sent with the webhook request.
  - Option to include file contents in the webhook payload.
  - Option to use dedicated IP addresses for outbound webhook requests (when configured).
