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

Generate browser download links for files in Drive and upload files to Drive. Create, copy, move, rename, trash, and permanently delete files and folders. Supports uploading via simple, multipart, and resumable upload methods. When you create a file, you can convert some file types into a Google Docs, Google Sheets, or Google Slides document. Files can be exported from Google Workspace formats (Docs, Sheets, Slides) to standard formats (PDF, DOCX, XLSX, etc.).

`upload_file` performs Drive-native conversion by pairing a source media MIME type (for example, `text/markdown`) with a Google Workspace metadata MIME type (for example, `application/vnd.google-apps.document`). `create_file` creates empty native Docs, Sheets, and Slides when given the corresponding Google Workspace MIME type. These existing contracts make a separate conversion flag unnecessary.

### Search and Querying

Search for files and folders stored in Drive. Create complex search queries that return any of the file metadata fields in the files resource. Queries can filter by name, MIME type, parent folder, ownership, modification date, shared status, labels, and many other metadata fields.

### Sharing and Permissions

Let users share files, folders, and drives to collaborate on content. Permissions can be granted to specific users, groups, domains, or anyone with a link. Role-based access includes owner, organizer, fileOrganizer, writer, commenter, and reader.

### Shared Drives

A shared drive is a storage location that owns files that multiple users collaborate on. Any user with access to a shared drive has access to all files it contains. Users can also be granted access to individual files inside the shared drive. You can create, update, delete, and list shared drives, and manage their members.

### Comments and Replies

Files support threaded comments and replies. You can create, read, update, and delete comments and replies on files, and resolve/reopen comment threads.

`update_comment` patches the parent comment by default. Supplying `replyId` uses the Drive replies update endpoint instead, so callers can edit a reply without changing the parent comment.

### File Revisions

Track and manage the revision history of files. You can list, get, update, and delete revisions. Revisions can be downloaded to retrieve earlier versions of a file.

### Labels

Apply labels to Drive files, set label field values, read label field values on files, and search for files using label metadata terms defined by the custom label taxonomy.

### Shortcuts

Create third-party shortcuts that are external links to data stored outside of Drive, in a different datastore or cloud storage system.

### Change Tracking

The changes collection provides an efficient way to detect all file changes, including those shared with a user. If the file has changed, the collection provides the current state of each file. Uses a page token mechanism to retrieve incremental changes since the last check.

`list_changes` has two modes in one object-shaped input contract. When `pageToken` is omitted it returns a fresh `startPageToken` and no historical changes; `driveId` can select a shared drive in this mode. When `pageToken` is supplied it returns the current page of file or shared-drive changes plus `nextPageToken` or `newStartPageToken`; `driveId`, `includeRemoved`, `pageSize`, and `spaces` map to the Drive v3 changes API in this mode.

### Account and Quota Information

`get_about` returns the authenticated Drive user's permission ID, display name, email address, and available storage quota limit and usage values from Drive v3 `about.get`. All user fields are optional in the output because Drive can return a partial `user` object in some contexts.

### App Data Folder

Applications can store per-user configuration or data in a hidden app-specific folder that the user cannot directly access. Requires the `drive.appdata` scope.

## Events

The **Recent File Activity** event checks [Drive file search](https://developers.google.com/workspace/drive/api/guides/ref-search-terms) every 15 minutes for My Drive files and shared-drive files the connected user has accessed, with a `modifiedTime` in the last 30 minutes. It emits `file.recently_modified`. The output contains `fileId`, `fileName`, `mimeType`, current `trashed` state, and `modifiedTime`, plus available `parents`, `webViewLink`, and last-modifier fields. A file might yield `{"fileId":"abc123","fileName":"Plan","mimeType":"application/vnd.google-apps.document","trashed":false,"modifiedTime":"2026-09-23T10:00:00.000Z"}`.

Event IDs and duplicate suppression use file ID, modification time, and current trash state. This current-file snapshot does not report permanent deletions, lost access, the time a file moved to trash, or every intermediate change. The default [user corpus](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives) does not scan every file in every shared drive. A long polling outage can move changes outside the 30-minute window. For complete history, call `list_changes` and persist its [page token](https://developers.google.com/workspace/drive/api/guides/manage-changes).
