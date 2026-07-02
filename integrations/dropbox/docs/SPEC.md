# Slates Specification for Dropbox

## Overview

Dropbox is a cloud storage platform that provides file storage, synchronization, and sharing capabilities. Its API (v2) allows this integration to access user files and folders, sharing, file requests, temporary file links, thumbnails, upload sessions, revisions, account information, and file-change notifications.

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

**OpenID Connect:** Dropbox supports OIDC scopes (`openid`, `email`, `profile`) when explicitly requested via the `scope` parameter. This integration does not require OIDC scopes because it retrieves profile information from the Dropbox account endpoint.

**Content Access Levels:** When creating an app, you select either "App folder" (scoped access to a dedicated folder within the user's Apps folder) or "Full Dropbox" (access to the user's entire Dropbox).

**Scopes:** Dropbox uses OAuth scopes to determine the actions the application is allowed to perform. Scopes are configured in the Permissions tab of the App Console. This integration requests user-account, file metadata/content, sharing, and file request scopes needed for the exposed user-file workflows. It does not expose Dropbox Business team administration tools.

**Authentication Types:**

- **User Authentication** is the most common type. It uses an access token for a specific user and app pair to operate on that user's account.
- **Team Authentication** uses an access token for a specific team and app pair. Applications that authorize team scopes to use the Business API receive a team access token.
- Team access tokens can act on behalf of individual team members using the `Dropbox-API-Select-User` header with a `team_member_id`. All API calls that support User Authentication support this methodology.
- **App Authentication** uses the app's own app key and secret. This type doesn't identify a specific user or team. The credentials are transmitted using HTTP basic authentication.

## Features

### File and Folder Management

Create, read, edit, move, and delete files and folders using the Files API. Supports uploading and downloading files, creating folders, copying, moving, and deleting content. Files have unique IDs that remain constant even when moved or renamed, so you can reference files by path or by ID.

- Supports text and base64 file uploads plus upload sessions for larger or chunked files.
- Downloads and thumbnails return file bytes through Slate attachments.
- Temporary file links can be generated for streaming content.
- File search by name or content.
- File revisions: view and restore previous versions.
- Thumbnails can be generated for supported image files.

### Sharing

Create, list, and revoke shared links. Programmatically share folders and manage basic folder membership.

- Manage shared folder members (add, remove, update permissions).
- Create and manage shared links with configurable access settings (password, expiration, audience).

### File Requests

Automate document collection with the File Requests API. Create, list, update, and manage file requests that allow others to upload files to your Dropbox.

### User Account Information

Retrieve information about the authenticated user's account, including name, email, storage quota, and account type. Retrieve information about other connected accounts by account ID.

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
