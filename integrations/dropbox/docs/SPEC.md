# Slates Specification for Dropbox

## Overview

Dropbox is a cloud storage platform that provides file storage, synchronization, and sharing capabilities. Its API (v2) allows programmatic access to files, folders, sharing, team management, and user account information. Dropbox also offers a Business API for team administration, auditing, and content management.

## Authentication

Dropbox uses **OAuth 2.0** as its sole authentication method. Apps are created in the Dropbox App Console, where you receive an **App Key** (client ID) and **App Secret** (client secret).

**OAuth 2.0 Endpoints:**

- Authorization URL: `https://www.dropbox.com/oauth2/authorize`
- Token URL: `https://api.dropbox.com/oauth2/token`

**Flow:**

1. The user is redirected to Dropbox to authorize your app. After approval, the user is sent back to your app with an authorization code, which your application exchanges for an access token.
2. When using refresh tokens, the call to the `/oauth2/token` endpoint with `grant_type=authorization_code` returns a short-lived access token and a refresh token. To receive a refresh token, include `token_access_type=offline` as a parameter on the authorization URL.
3. To update the access token, call the `/oauth2/token` endpoint specifying the refresh token as a parameter with `grant_type=refresh_token`. The endpoint returns a new short-lived access token and a timestamp indicating its expiration.

**PKCE Support:** Dropbox supports PKCE, an extension to OAuth that enables dynamic client secrets, designed for public clients that cannot guarantee safety of the client secret. PKCE is recommended for desktop, mobile, single-page JavaScript, and open source apps.

**OpenID Connect:** Dropbox supports OIDC scopes (`openid`, `email`, `profile`) which must be explicitly requested via the `scope` parameter. OIDC is only supported with the code grant flow (`response_type=code`).

**Content Access Levels:** When creating an app, you select either "App folder" (scoped access to a dedicated folder within the user's Apps folder) or "Full Dropbox" (access to the user's entire Dropbox).

**Scopes:** Dropbox uses OAuth scopes to determine the actions the application is allowed to perform. Scopes are configured in the Permissions tab of the App Console. The selected scopes are applied to the access token and determine which API calls the application can execute. Scopes are generally organized into read and write actions on major objects, including: `account_info.read`, `files.metadata.read`, `files.metadata.write`, `files.content.read`, `files.content.write`, `sharing.read`, `sharing.write`, `file_requests.read`, `file_requests.write`, `contacts.read`, `contacts.write`, and various `team_*` scopes for Business API access (e.g., `team_data.member`, `team_info.read`, `members.read`, `events.read`).

**Authentication Types:**

- **User Authentication** is the most common type. It uses an access token for a specific user and app pair to operate on that user's account.
- **Team Authentication** uses an access token for a specific team and app pair. Applications that authorize team scopes to use the Business API receive a team access token.
- Team access tokens can act on behalf of individual team members using the `Dropbox-API-Select-User` header with a `team_member_id`. All API calls that support User Authentication support this methodology.
- **App Authentication** uses the app's own app key and secret. This type doesn't identify a specific user or team. The credentials are transmitted using HTTP basic authentication.

## Features

### File and Folder Management

Create, read, edit, move, and delete files and folders using the Files API. Supports uploading and downloading files, creating folders, copying, moving, and deleting content. Files have unique IDs that remain constant even when moved or renamed, so you can reference files by path or by ID.

- Supports upload sessions for large files.
- File search by name or content.
- File revisions: view and restore previous versions.
- Thumbnails can be generated for image and document files.

### Sharing

Create, list, and revoke shared links. Programmatically share folders and manage folder policies and membership.

- Manage shared folder members (add, remove, update permissions).
- Create and manage shared links with configurable access settings (password, expiration, audience).

### File Requests

Automate document collection with the File Requests API. Create, list, update, and manage file requests that allow others to upload files to your Dropbox.

### File Properties (Custom Metadata)

Assign custom metadata labels to Dropbox content with the File Properties API. Define property templates and apply custom key-value metadata to files and folders.

### User Account Information

Retrieve information about the authenticated user's account, including name, email, storage quota, and account type. Retrieve information about other connected accounts by account ID.

### Team Administration (Business API)

Gain access to admin functionality with user and team management using the Dropbox Business APIs.

- Manage team members: add, remove, suspend, and update team members.
- Manage groups: create, delete, and update group membership.
- Manage team folders: create, archive, and configure team folders.
- Retrieve team information and feature settings.
- The team audit log (Events API) enables viewing all changes to team files, sharing, team membership, settings changes, logins and devices, and more.

### Contacts

Read and manage the authenticated user's contacts.

## Events

Dropbox supports webhooks for real-time notifications of file changes.

### User File Change Notifications

Webhooks notify web apps in real time when users' files change in Dropbox. Once you register a URI to receive webhooks, Dropbox sends an HTTP request to that URI every time there's a change in any of the accounts connected to your app.

- Webhook URIs are registered in the Dropbox App Console.
- Only user IDs with file changes are provided in the payload. Your app is expected to call `/files/list_folder/continue` to find out what specific files changed.
- Webhooks trigger for any file changes the application has access to. They will not indicate changes to sharing settings or other metadata.
- Requires the `files.metadata.read` scope to be authorized.
- Webhook verification uses a GET request with a `challenge` parameter that must be echoed back.
- Notifications are signed with HMAC-SHA256 using the app secret, provided in the `X-Dropbox-Signature` header.

### Business Team File Change Notifications

For Dropbox Business API apps, webhook notifications are available for all members of a connected team, similar to user-level notifications. The payload includes team IDs and member IDs with changes. Business API webhooks can also deliver notifications on team membership changes.
