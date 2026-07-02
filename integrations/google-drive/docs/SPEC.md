# Slates Specification for Google Drive

## Overview

Google Drive is a cloud storage service by Google that allows users to store, share, and collaborate on files and folders. The Google Drive API lets you create apps that use Google Drive cloud storage, and develop applications that integrate with Drive. It supports managing files across personal ("My Drive") and shared drives within Google Workspace organizations.

## Authentication

Google Drive API supports two primary authentication methods:

### OAuth 2.0 (User Authentication)

To authorize your app, the Google Drive API requires you to define OAuth scopes in two places: the Google Cloud console and your app. You need a Google Cloud project with the Drive API enabled, and OAuth 2.0 credentials (client ID and client secret) configured in the Google Cloud Console.

**OAuth Endpoints:**

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`

To access private data, your app must obtain an access token. A single access token can grant varying degrees of access to multiple APIs. Because access tokens are short-lived, you must use refresh tokens for long-term access. A refresh token allows your app to request new access tokens. Save refresh tokens in secure, long-term storage.

**Available Scopes:**

The following scopes are available:

| Scope                                                     | Description                                            | Sensitivity   |
| --------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `https://www.googleapis.com/auth/drive`                   | Full access to all Drive files                         | Restricted    |
| `https://www.googleapis.com/auth/drive.readonly`          | Read-only access to all Drive files                    | Restricted    |
| `https://www.googleapis.com/auth/drive.file`              | Access only to files created or opened by the app      | Non-sensitive |
| `https://www.googleapis.com/auth/drive.appdata`           | Access to app-specific data folder                     | Non-sensitive |
| `https://www.googleapis.com/auth/drive.metadata`          | Read/write access to file metadata only                | Sensitive     |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | Read-only access to file metadata                      | Sensitive     |
| `https://www.googleapis.com/auth/drive.photos.readonly`   | Read-only access to photos and videos in Google Photos | Sensitive     |
| `https://www.googleapis.com/auth/drive.scripts`           | Access to Apps Script project files                    | Sensitive     |

Restricted scopes provide wide access to Google user data and require restricted scope OAuth App Verification. The `drive.file` scope is a non-sensitive scope that allows users to choose which files they want to share with your application.

### Service Accounts

Service accounts can also be used for authentication. A service account uses a JSON key file for server-to-server authentication without user interaction. Service accounts can impersonate users within a Google Workspace domain via domain-wide delegation. You need the service account key file (JSON) and must specify the desired scopes.

### API Keys

API keys can be used for accessing publicly shared files only. An API key can be passed to authenticate requests, but it only provides access to publicly available data.

## Features

### File and Folder Management

Download files from Drive and upload files to Drive. Create, copy, move, rename, trash, and permanently delete files and folders. Supports uploading via simple, multipart, and resumable upload methods. When you create a file, you can convert some file types into a Google Docs, Google Sheets, or Google Slides document. Files can be exported from Google Workspace formats (Docs, Sheets, Slides) to standard formats (PDF, DOCX, XLSX, etc.).

### Search and Querying

Search for files and folders stored in Drive. Create complex search queries that return any of the file metadata fields in the files resource. Queries can filter by name, MIME type, parent folder, ownership, modification date, shared status, labels, and many other metadata fields.

### Sharing and Permissions

Let users share files, folders, and drives to collaborate on content. Permissions can be granted to specific users, groups, domains, or anyone with a link. Role-based access includes owner, organizer, fileOrganizer, writer, commenter, and reader.

### Shared Drives

A shared drive is a storage location that owns files that multiple users collaborate on. Any user with access to a shared drive has access to all files it contains. Users can also be granted access to individual files inside the shared drive. You can create, update, delete, and list shared drives, and manage their members.

### Comments and Replies

Files support threaded comments and replies. You can create, read, update, and delete comments and replies on files, and resolve/reopen comment threads.

### File Revisions

Track and manage the revision history of files. You can list, get, update, and delete revisions. Revisions can be downloaded to retrieve earlier versions of a file.

### Labels

Apply labels to Drive files, set label field values, read label field values on files, and search for files using label metadata terms defined by the custom label taxonomy.

### Shortcuts

Create third-party shortcuts that are external links to data stored outside of Drive, in a different datastore or cloud storage system.

### Change Tracking

The changes collection provides an efficient way to detect all file changes, including those shared with a user. If the file has changed, the collection provides the current state of each file. Uses a page token mechanism to retrieve incremental changes since the last check.

### App Data Folder

Applications can store per-user configuration or data in a hidden app-specific folder that the user cannot directly access. Requires the `drive.appdata` scope.

## Events

Google Drive supports two webhook-based mechanisms for receiving change notifications:

### Drive API Push Notifications (Stable)

The Google Drive API provides push notifications that let you monitor changes in resources. You can use this feature to improve the performance of your application. It lets you eliminate the extra network and compute costs involved with polling resources. Whenever a watched resource changes, the Google Drive API notifies your application.

There are two watch methods:

- **File Watch (`files.watch`)**: Subscribes to changes to a single file. Notifies when the file's content or metadata changes.
- **Changes Watch (`changes.watch`)**: Subscribes to changes for a user. Notifies when any file in the user's Drive (or a specific shared drive) changes.

**Configuration:**

- Requires a `type` property set to `web_hook` and an `address` property set to the HTTPS webhook callback URL.
- An optional expiration time in milliseconds can be set for the channel.
- There is no automatic way to renew a notification channel. When a channel is close to its expiration, you must replace it with a new one by calling the watch method.
- The webhook callback URL domain must be verified in the Google Cloud Console.
- Notifications include headers such as `X-Goog-Resource-State` (e.g., add, remove, update) and `X-Goog-Changed` (e.g., content, parents, children, permissions).
- Notifications are succinct — they only indicate that something changed, not the specific details of the change. You must call the Changes API or Files API to retrieve the actual change details.

### Google Workspace Events API (Developer Preview)

Google Drive is integrated with the Workspace Events API, which allows developers to create subscriptions on Drive items and receive notifications via Cloud Pub/Sub when those resources change. This offers a more reliable, featureful way of receiving events over the current `files.watch` and `changes.watch` methods.

This is currently in Developer Preview and requires the v1beta version of the API.

**Supported event types:**

- File added to a folder or shared drive; file moved to a folder or shared drive; file edited or new revision uploaded; file trashed or removed from trash; access proposal created or resolved on a file.
- An access proposal is created or resolved on a file. An approval is created, cancelled, reset, or completed on a file.

**Configuration:**

- Requires a Google Cloud Pub/Sub topic as the notification endpoint.
- You specify the `targetResource` (a file, folder, or shared drive) and `eventTypes` (an array of event types you want to receive).
- Subscriptions are supported for events on all files and folders but not on the root folder of shared drives. For shared drives, subscriptions are only supported for files and folders inside them. Changes made directly to the root folder of a shared drive won't trigger events.
