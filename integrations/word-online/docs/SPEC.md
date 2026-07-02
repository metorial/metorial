Now let me get more details on the specific file/drive operations and the delta query for OneDrive items.Now I have enough information to write the specification. Word Online doesn't have its own dedicated API — it's accessed through Microsoft Graph's DriveItem/Files API, since Word documents are managed as files in OneDrive/SharePoint.

# Slates Specification for Word Online

## Overview

Word Online is Microsoft's browser-based word processing application, part of Microsoft 365. It does not have a dedicated REST API; instead, Word documents are managed as files (driveItems) through the Microsoft Graph API, which provides capabilities for file operations on documents stored in OneDrive and SharePoint. As of today, there is no Word API available under Microsoft Graph — document operations are handled through Working with files in Microsoft Graph, which supports creating, updating, uploading, and downloading files through MS Graph.

## Authentication

Word Online is accessed via the Microsoft Graph API, which uses OAuth 2.0 for authentication. Before your app can be authorized to call any Microsoft Graph API, the Microsoft identity platform must first be aware of it, requiring app registration in Microsoft Entra ID (Azure AD).

**App Registration Requirements:**

- Register the app in the Microsoft Entra admin center to establish configuration information including: Application ID (a unique identifier assigned by the Microsoft identity platform) and Redirect URI/URL (one or more endpoints at which your app receives responses from the Microsoft identity platform).
- A client secret or certificate credential is also required for confidential clients.
- You must have information of tenant ID, client ID, and client secret of the registered application through Azure Active Directory.

**OAuth 2.0 Flows:**

1. **Authorization Code Flow (Delegated Access):** Used when acting on behalf of a signed-in user. Delegated access means an app acts on behalf of a signed-in user, and both the client app and the user must be authorized to make the request.
   - Authorization endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
   - Token endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
   - The `{tenant}` value can be a specific tenant ID, `common`, `organizations`, or `consumers`.

2. **Client Credentials Flow (App-Only Access):** Used for background services or automation without a signed-in user. In this access scenario, the application can interact with data on its own, without a signed-in user. App-only access is used in scenarios such as automation and backup, and is mostly used by apps that run as background services or daemons.
   - Token endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
   - Scope: `https://graph.microsoft.com/.default`

**Relevant Scopes (Permissions):**

- `Files.Read` — Read the signed-in user's files
- `Files.ReadWrite` — Read and write the signed-in user's files
- `Files.Read.All` — Read all files the user can access
- `Files.ReadWrite.All` — Read and write all files the user can access
- `Sites.Read.All` — Read items in all site collections (for SharePoint-stored documents)
- `Sites.ReadWrite.All` — Read and write items in all site collections
- `offline_access` — Required to obtain refresh tokens

Two types of permissions are available: Delegated permissions (also called scopes) allow the application to act on behalf of the signed-in user. Application permissions (also called app roles) allow the app to access data on its own, without a signed-in user.

## Features

### Document Upload and Creation

Upload or create new Word documents in OneDrive or SharePoint. Small files can be uploaded directly, while larger files require a resumable upload session. Documents can be created by uploading `.docx` content to a specified drive location.

- Files are addressed by drive ID and item ID, or by path within a drive.
- Only works with files stored in OneDrive or SharePoint Online.

### Document Download and Content Retrieval

Download Word documents as binary streams from OneDrive or SharePoint. The content endpoint on a drive item returns a stream. In order to edit a Word or PowerPoint document, you need to use some library to get the document from the stream.

- The Graph API returns the full document file; there is no built-in way to extract text content only via the API.

### Format Conversion

Convert Word documents to other formats, notably PDF. To convert a Word document to PDF, you would use the download-in-another-format endpoint with the format variable set to pdf.

- Supports .docx, .doc, .pptx, .xlsx, .rtf, and more.
- Supported output format is primarily PDF.

### File Management (Move, Copy, Delete, Rename)

Manage Word document files within OneDrive and SharePoint, including moving documents between folders, copying them, deleting them, and renaming them. You can delete a driveItem, move a driveItem to a new parent item, and restore a deleted driveItem that is currently in the recycle bin.

### Sharing and Permissions

Manage sharing permissions on Word documents. You can create a link to share the driveItem, send a sharing invite to a user, and retrieve the collection of permissions on a driveItem.

- Supports sharing links (view-only or edit) and direct user/group invitations.
- Sharing links provide a unique URL that includes both the resource being shared and an authentication token. Users don't need to sign in to access the content shared with a sharing link. Users can share a link that gives read-only access or writable access.
- Permissions can be created, updated, listed, and removed.

### Version History

Retrieve previous versions of a Word document. You can retrieve the versions of a file in the current user's drive.

- Useful for tracking changes and restoring earlier document states.

### Document Preview

Obtain a short-lived embeddable URL for an item in order to render a temporary preview.

- The preview action is currently only available on SharePoint and OneDrive for Business.

### Check-In / Check-Out

Control document editing access through check-in and check-out. Check in a checked-out driveItem resource, which makes the version of the document available to others. Check out a driveItem resource to prevent others from editing the document, and prevent your changes from being visible until the document is checked in.

### Search

Search for Word documents across OneDrive and SharePoint using Microsoft Graph's search capabilities. Documents can be found by name, content, or metadata.

### Thumbnails

Retrieve thumbnail images for Word documents. Collection of thumbnailSet objects associated with the item. For more information, see getting thumbnails.

## Events

Microsoft Graph supports webhook-based change notifications for files (driveItems) stored in OneDrive and SharePoint, which includes Word documents.

### DriveItem Change Notifications

You can subscribe to content in the hierarchy of a root folder DriveItem in OneDrive for Business, or of a root folder or subfolder DriveItem in a user's personal OneDrive.

- Notifications are sent for the requested types of changes on the subscribed folder, or any file, folder, or other driveItem instances in its hierarchy. You cannot subscribe to drive or driveItem instances that are not folders, such as individual files.
- Drive root item change notifications support only the "updated" changeType.
- Subscriptions require a notification URL (HTTPS endpoint) and have an expiration time that must be periodically renewed.
- The Microsoft Graph REST API can deliver change notifications to clients through various endpoints, including webhooks, Event Hubs, and Event Grid.
- To identify specific changes after receiving a notification, use Microsoft Graph's delta query to retrieve all changes since the last request.
