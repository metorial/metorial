# Slates Specification for OneDrive

## Overview

OneDrive is Microsoft's cloud file storage and synchronization service. The OneDrive REST API is a portion of the Microsoft Graph API which allows apps to connect to content stored in OneDrive and SharePoint. The REST API is shared between OneDrive, OneDrive for Business, SharePoint document libraries, and Office Groups.

## Authentication

Microsoft Graph, OneDrive, and SharePoint support using a standard OAuth 2.0 or Open ID Connect authorization flow. Requests to Microsoft Graph are authenticated using bearer tokens obtained from one of these flows.

**App Registration:** The first step is to register an app with Microsoft and provide some details about your app. You can register your application and receive a new app ID from the Azure App registrations page.

**OAuth 2.0 Authorization Code Flow (recommended for long-term access):**

The code flow is a three-step process with separate calls to authenticate and authorize the application and to generate an access token. This also allows your application to receive a refresh token that will enable long-term use of the API.

- **Authorization endpoint:** `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- **Token endpoint:** `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- Required parameters: `client_id`, `client_secret`, `redirect_uri`, `scope`, `response_type=code`
- The `common` tenant can be replaced with a specific tenant ID to restrict sign-in to a particular Azure AD tenant.

**OAuth 2.0 Client Credentials Flow (app-only, no user context):**

For server-to-server scenarios without user interaction, use the client credentials grant. This requires a tenant ID in the token endpoint URL (`https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token`) with `grant_type=client_credentials` and `scope=https://graph.microsoft.com/.default`.

**OAuth 2.0 Implicit Flow (token flow):**

The most straightforward authorization flow is the token flow. This flow is useful for quickly obtaining an access token to use the OneDrive API in an interactive fashion. This flow does not provide a refresh token, and therefore is not a good fit for long-term access to resources.

**Scopes:**

Scopes determine what type of access the app is granted when the user is signed in. Key scopes include:

- `Files.Read` — Allows the app to read the signed-in user's files.
- `Files.Read.All` — Allows the app to read all files the signed-in user can access.
- `Files.ReadWrite` — Allows the app to read, create, update, and delete the signed-in user's files.
- `Files.ReadWrite.All` — Allows the app to read, create, update, and delete all files the signed-in user can access.
- `Files.ReadWrite.AppFolder` — Write files into the app's folder in OneDrive (personal accounts only).
- `Sites.Read.All`, `Sites.ReadWrite.All` — For accessing SharePoint sites and document libraries.
- `Sites.Selected` — For scoped access to specific SharePoint site collections.
- `offline_access` — This step will return a refresh_token that can be used to generate additional access tokens after the initial token has expired.

## Features

### File and Folder Management

Upload, download, create, copy, move, rename, and delete files and folders in a user's OneDrive or a SharePoint document library. Use special folders to store files in well-known locations on OneDrive, like Documents and Camera Roll, or give your app its own personal folder. Files can be addressed by unique ID or by file system path.

- Supports simple upload for small files and resumable upload sessions for large files (up to 250 GB).
- Files can be downloaded in alternative formats (e.g., PDF conversion).
- Your app can display custom-sized thumbnails for hundreds of different file formats.

### Sharing and Permissions

One of the most common actions for OneDrive and SharePoint document libraries is sharing content with other people. Microsoft Graph allows your app to create sharing links, add permissions and send invitations to items in a drive.

- Create anonymous, organization-wide, or user-specific sharing links with read or read/write roles.
- Manage permissions on individual files and folders.
- Access files shared with the current user.

### Search

Search for files across a user's OneDrive by file name, content, or metadata. Search results can span the user's own drive as well as items shared with them.

### Rich Content and Metadata

With Microsoft Graph, you can access rich content through REST APIs without having to download the binary. Explore extracted metadata from photo, audio, and video files. Use the Excel API to work directly with the raw data stored in an Excel workbook.

- Access file previews without downloading the full file.

### Drive Management

Files in Microsoft 365 are stored in drives. Users can store files in a personal drive—their OneDrive—or in a shared drive powered by a SharePoint document library.

- List available drives for a user, group, or site.
- Get drive metadata including storage quota information.

### Delta Query (Change Tracking)

This method allows your app to track changes to a drive and its children over time. It is a purpose-built polling mechanism that efficiently returns only items that have been created, modified, or deleted since the last query, using opaque delta tokens.

- For shared folders added to a drive, delta will not return any information about changes within the shared folder. A separate delta call targeting the shared folder is required.
- Can optionally track permission/sharing changes with special request headers (OneDrive for Business only).

## Events

OneDrive supports webhooks via the Microsoft Graph subscriptions API. OneDrive provides service-to-service notifications through webhooks. Webhooks provide a simple notification pipeline so your app can be aware of changes to a user's drive without polling the service.

### Drive Item Changes

Subscribe to notifications when any content within a drive is changed (files or folders created, modified, or deleted).

- Based on the documentation OneDrive only supports the "updated" changeType. The notification signals that something changed, but does not specify what changed.
- The notification doesn't include any information about the changes that triggered it. Your app is expected to use the delta verb to detect any changes to the state of items in OneDrive.
- The resource to subscribe to is the drive root (e.g., `/me/drive/root`). Webhook registration is only possible at the root of an enterprise OneDrive.
- Files in OneDrive (driveItems) can have a maximum subscription expiration time of 42,300 minutes (approximately 30 days) from when the subscription is created. Subscriptions must be renewed before expiration.
- A `clientState` property can be set during subscription creation and is included in each notification for verification.

### Permission/Security Changes (OneDrive for Business only)

To subscribe to these events you will need to add the "prefer:includesecuritywebhooks" header to your request to register a webhook. Once the webhook is registered you will receive notifications when the permissions on an item change.

- This header is applicable to SharePoint and OneDrive for Business but not consumer OneDrive accounts.
