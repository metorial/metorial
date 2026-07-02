Now I have enough information to write the specification. PowerPoint Online doesn't have its own standalone REST API — it's accessed through Microsoft Graph API, which handles file operations (upload, download, convert, share) for PowerPoint files stored in OneDrive or SharePoint. Let me also check the sharing/permissions capabilities.

# Slates Specification for PowerPoint Online

## Overview

PowerPoint Online is Microsoft's web-based presentation application, part of Microsoft 365. It does not have a dedicated REST API; instead, programmatic access to PowerPoint files is provided through the Microsoft Graph API, which treats presentations as drive items stored in OneDrive or SharePoint document libraries. For web-based scenarios, developers typically use Office Add-ins or Microsoft Graph API for broader Office 365 integration.

## Authentication

PowerPoint Online is accessed via Microsoft Graph, which uses **OAuth 2.0** through the Microsoft identity platform (Microsoft Entra ID, formerly Azure AD).

### Prerequisites

Before your app can be authorized to call any Microsoft Graph API, the Microsoft identity platform must first be aware of it. This involves registering the app in the Microsoft Entra admin center to establish its configuration information including: an Application (client) ID assigned by the identity platform, and one or more redirect URIs at which your app receives responses. You also need a client secret or certificate for confidential clients.

### OAuth 2.0 Flows

**Authorization Code Flow (Delegated):** For accessing resources on behalf of a signed-in user.

- Authorization endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
- Token endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`

Where `{tenant}` is the Azure AD tenant ID, `common`, or `organizations`.

**Client Credentials Flow (App-only):** In this access scenario, the application can interact with data on its own, without a signed-in user. App-only access is used in scenarios such as automation and backup, and is mostly used by apps that run as background services or daemons. It's suitable when it's undesirable to have a user signed in, or when the data required can't be scoped to a single user.

For client credentials, specify the preconfigured permissions by passing `https://graph.microsoft.com/.default` as the value for the scope parameter in the token request.

### Relevant Scopes

For working with PowerPoint files (as drive items), the following Microsoft Graph scopes apply:

- `Files.Read` — Read the signed-in user's files
- `Files.Read.All` — Read all files the user can access
- `Files.ReadWrite` — Read and write the signed-in user's files
- `Files.ReadWrite.All` — Read and write all files the user can access
- `Sites.Read.All` / `Sites.ReadWrite.All` — For accessing files in SharePoint sites
- `offline_access` — Gives your app access to resources on behalf of the user for an extended time (enables refresh tokens)

### Custom Inputs

- **Tenant ID**: Required. The Azure AD tenant identifier, used in the authorization and token endpoint URLs.
- **Client ID**: Required. The application's registered client ID.
- **Client Secret** (or Certificate): Required for confidential/web apps.

## Features

### File Management (Upload, Download, Delete)

PowerPoint presentations stored in OneDrive or SharePoint can be managed as drive items through Microsoft Graph. The Drive resource is the top-level object within a user's OneDrive or a SharePoint document library. Nearly all file operations will start by addressing a specific drive resource. You can upload new .pptx files, download existing presentations, update file content, move, copy, and delete presentations.

- Files can be addressed by unique ID or by file system path.
- Supports simple upload for small files and resumable upload sessions for large files.

### File Format Conversion

You can retrieve the contents of an item in a specific format. Not all files can be converted into all formats. PowerPoint files (.pptx) can be converted to PDF format on download. The Graph API supports conversion from .pptx to .pdf.

- Conversion happens server-side; no local processing is required.
- Only certain source formats are supported for conversion.

### Sharing and Permissions

Presentations can be shared with other users by creating sharing links or granting direct permissions through the Graph API. You can create view-only or edit sharing links, invite specific users with defined roles, and manage existing permissions on a file.

- Supports anonymous links, organization-wide links, and user-specific sharing.
- Permissions can be read, updated, or revoked.

### File Metadata and Properties

You can retrieve and update metadata for PowerPoint files, including name, size, created/modified timestamps, parent folder information, and other properties exposed through the driveItem resource. driveItem resources have facets modeled as properties that provide data about the driveItem's identities and capabilities.

### Thumbnails and Previews

Retrieving thumbnails for each page in a PowerPoint presentation using Microsoft Graph can be achieved. You can also generate embeddable preview URLs for presentations. The preview action is currently only available on SharePoint and OneDrive for Business.

### Search

Files including PowerPoint presentations can be discovered using Microsoft Graph's search capabilities across OneDrive and SharePoint.

### Version History

Microsoft Graph supports accessing version history for files in OneDrive and SharePoint. You can list previous versions of a PowerPoint file, download a specific version, or restore a previous version.

### Content Limitations

Currently using Microsoft Graph API, it is not possible to view Word/PowerPoint inline comments. Microsoft Graph treats PowerPoint files as opaque binary blobs — the content endpoint on drive item returns a stream. In order to edit a Word or PowerPoint document you need to use some library to get the document from a stream. There is no API to directly manipulate individual slides, shapes, or text within a presentation via the Graph API.

## Events

Microsoft Graph supports webhook-based change notifications for drive items, which includes PowerPoint files stored in OneDrive or SharePoint.

### DriveItem Change Notifications

You can subscribe to content in the hierarchy of a root folder DriveItem in OneDrive for Business, or of a root folder or subfolder DriveItem in a user's personal OneDrive. This means you receive notifications when PowerPoint files are created, updated, or deleted within a subscribed folder.

- Notifications are sent for the requested types of changes on the subscribed folder, or any file, folder, or other driveItem instances in its hierarchy. You cannot subscribe to drive or driveItem instances that are not folders, such as individual files.
- Drive root item and list change notifications support only the `updated` changeType. Delta queries can then be used to identify the specific changes.
- Subscriptions have a limited lifetime. Apps need to renew their subscriptions before the expiration time; otherwise, they need to create a new subscription.
- Notifications can be delivered via webhooks, Azure Event Hubs, or Azure Event Grid.
