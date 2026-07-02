Now let me get the full list of webhook triggers:# Slates Specification for Box

## Overview

Box is a cloud-based content management platform that enables businesses to securely store, share, and collaborate on files and folders. It provides a RESTful API with 150+ endpoints for file management, collaboration, metadata, e-signatures, AI-powered content analysis, and enterprise administration.

## Authentication

Box supports four authentication methods, all of which ultimately produce an Access Token used to call the API.

### OAuth 2.0 (User Authentication)

The standard client-side authentication method for integrating with existing Box users. Requires a client ID and client secret obtained from the Box Developer Console.

- **Authorization URL:** `https://account.box.com/api/oauth2/authorize`
- **Token URL:** `https://api.box.com/oauth2/token`
- **Required parameters:** `client_id`, `client_secret`, `redirect_uri`
- **Flow:** Standard OAuth 2.0 Authorization Code flow. The user is redirected to Box to log in and grant access, then redirected back with an authorization code that is exchanged for an access token and refresh token.
- **Access tokens** expire after approximately 60 minutes and can be refreshed using the refresh token.

### JWT (Server Authentication)

Server-to-server authentication with no end-user interaction. The application authenticates using a JSON Web Token signed with an RSA key pair. Upon admin authorization, a Service Account is created that can act on behalf of any enterprise user.

- **Requires:** Client ID, client secret, public/private RSA key pair (generated via the Developer Console), enterprise ID.
- **Token URL:** `https://api.box.com/oauth2/token`
- The Developer Console provides a JSON config file containing all necessary credentials.
- An enterprise admin must authorize the JWT application in the Box Admin Console.

### Client Credentials Grant (CCG)

A server-side authentication method that uses only a client ID and client secret to obtain an access token, without requiring RSA keys.

- **Token URL:** `https://api.box.com/oauth2/token`
- **Required parameters:** `client_id`, `client_secret`, `grant_type=client_credentials`, and either `box_subject_type=enterprise` with an enterprise ID or `box_subject_type=user` with a user ID.
- An enterprise admin must authorize the CCG application.

### App Token Authentication

A simplified server-side method using fixed, long-lived access tokens restricted to the application's own Service Account. Best suited for applications that only need to read and write data within their own account (e.g., Box View). Limited to a subset of API endpoints.

### Application Scopes

Scopes are configured in the Developer Console and determine which API endpoints an application can call. Key scopes include:

- **Read all files and folders** (`root_readonly`)
- **Read/write all files and folders** (`root_readwrite`)
- **Manage users** (manage Managed Users, reset passwords, change roles)
- **Manage App Users** (JWT only)
- **Manage groups**
- **Manage webhooks**
- **Manage Sign requests**
- **Box AI**
- **Manage workflows** (Box Relay)

Scopes can be further restricted at the token level via downscoping, useful for exposing tokens in client-side environments.

## Features

### File Management

Upload, download, copy, move, rename, lock/unlock, and delete files. Supports chunked uploads for large files. Files can be versioned, with the ability to view, promote, or delete specific versions.

### Folder Management

Create, copy, move, rename, and delete folders. Retrieve folder contents including files and sub-folders. Folder structures can be deeply nested.

### Collaboration

Invite users or groups to collaborate on files and folders with configurable roles (editor, viewer, co-owner, etc.). Manage collaboration invitations, acceptances, and removals.

### Shared Links

Generate shareable URLs for files and folders with configurable access levels (open, company, collaborators), optional passwords, and expiration dates.

### Search

Full-text search across all content the authenticated user has access to. Supports filtering by file type, date ranges, metadata, owner, and ancestor folders.

### Metadata

Define custom metadata templates with typed fields and apply metadata instances to files and folders. Metadata can be used for classification, workflow triggers, and search filtering.

### Comments and Tasks

Add comments to files for discussion. Create tasks on files with assignments to specific users, due dates, and completion tracking.

### Box Sign (E-Signatures)

Create, send, and manage e-signature requests. Supports defining signers, signature placements, and templates. Track signing status through the API.

### Box AI

AI-powered features for asking questions about file content, generating text, and extracting structured data from documents. Supports creating custom AI agents via Box AI Studio. Requires the Box AI scope enabled.

### Events and Activity Monitoring

Retrieve enterprise-wide or user-specific event logs for auditing and compliance. Events cover actions like logins, file operations, sharing changes, and admin actions. Supports long-polling for near real-time event streaming.

### Users and Groups Management

Create, update, and delete managed users and app users. Manage enterprise groups and group memberships. Requires admin-level permissions.

### Retention Policies and Legal Holds

Define retention policies for content governance. Place legal holds on files, file versions, and folders to prevent deletion during litigation. Requires Box Governance add-on.

### Security Classifications

Define and apply security classification labels to files and folders. Requires Box Shield add-on.

### Document Generation (Doc Gen)

Dynamically generate documents from templates with merged data, useful for contracts, reports, and other templated content.

### Web Links (Bookmarks)

Create and manage web link bookmarks within Box folders.

## Events

Box supports webhooks (V2 recommended) that send HTTP POST notifications to a specified HTTPS URL when events occur on monitored files or folders.

### Configuration

- Webhooks are attached to specific files or folders (not the root folder in V2).
- Webhooks on folders cascade to all sub-folders and files within.
- Each webhook specifies a target (file or folder ID), a notification URL, and a list of trigger events.
- Webhook payloads are signed using HMAC-SHA256 with configurable primary and secondary signature keys for verification.
- The application must have the **Manage Webhooks** scope enabled.
- Failed deliveries are retried up to 10 times.

### File Events

Triggers for file lifecycle actions: `FILE.UPLOADED`, `FILE.DOWNLOADED`, `FILE.PREVIEWED`, `FILE.COPIED`, `FILE.MOVED`, `FILE.RENAMED`, `FILE.LOCKED`, `FILE.UNLOCKED`, `FILE.TRASHED`, `FILE.DELETED`, `FILE.RESTORED`.

### Folder Events

Triggers for folder lifecycle actions: `FOLDER.CREATED`, `FOLDER.DOWNLOADED`, `FOLDER.COPIED`, `FOLDER.MOVED`, `FOLDER.RENAMED`, `FOLDER.TRASHED`, `FOLDER.DELETED`, `FOLDER.RESTORED`.

### Collaboration Events

Triggers for collaboration changes on folders: `COLLABORATION.CREATED`, `COLLABORATION.ACCEPTED`, `COLLABORATION.REJECTED`, `COLLABORATION.REMOVED`, `COLLABORATION.UPDATED`.

### Comment Events

Triggers for comment activity on files and folders: `COMMENT.CREATED`, `COMMENT.UPDATED`, `COMMENT.DELETED`.

### Shared Link Events

Triggers for shared link changes: `SHARED_LINK.CREATED`, `SHARED_LINK.UPDATED`, `SHARED_LINK.DELETED`.

### Metadata Events

Triggers for metadata instance changes on files and folders: `METADATA_INSTANCE.CREATED`, `METADATA_INSTANCE.UPDATED`, `METADATA_INSTANCE.DELETED`.

### Task Assignment Events

Triggers for task assignment changes: `TASK_ASSIGNMENT.CREATED`, `TASK_ASSIGNMENT.UPDATED`.

### Sign Request Events

Triggers for e-signature workflow status changes: `SIGN_REQUEST.COMPLETED`, `SIGN_REQUEST.DECLINED`, `SIGN_REQUEST.EXPIRED`, `SIGN_REQUEST.SIGNER_EMAIL_BOUNCED`, `SIGN_REQUEST.SIGNER_SIGNED`, `SIGN_REQUEST.SIGNATURE_REQUESTED`, `SIGN_REQUEST.ERROR_FINALIZING`.

### Document Generation Events

Triggers for Doc Gen operations: `DOCGEN_DOCUMENT_GENERATION_STARTED`, `DOCGEN_DOCUMENT_GENERATION_SUCCEEDED`, `DOCGEN_DOCUMENT_GENERATION_FAILED`.

### Webhook Lifecycle Events

`WEBHOOK.DELETED` — notifies when a webhook itself is removed.
