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
| `https://www.googleapis.com/auth/drive.apps.readonly`     | View apps authorized to access your Drive              | Sensitive     |
| `https://www.googleapis.com/auth/drive.labels.readonly`   | View and use Drive labels                              | Non-sensitive |
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

Read the label definitions (fields and selection choices) the organization makes available to the user, and search for files using label metadata terms defined by the custom label taxonomy. Applying labels to files and managing label definitions are not supported.

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

The `folder_events` automatic webhook group requires an explicit `folderIds`
selection (1–100 folder IDs from `search_files`). Each selected folder can have
at most 5,000 immediate children. It exposes:

- `file_added_to_folder`: a file or folder becomes visible as an immediate child
  after activation. Moves, restores, and newly shared old files count as additions;
  this is not a file-creation claim.
- `file_updated`: a known immediate child has a newer string-valued Drive version,
  including content and metadata changes.

Nested contents are not watched recursively, and shortcuts are not followed.
Files present during the initial paginated baseline and catch-up are recorded
silently. Change entries represent the latest observed resource, so rapid edits
and moves may coalesce. Removal, trash, or loss of access clears known membership
without asserting deletion or emitting an unavailable event. Restoring access can
produce a later addition.

Each selected folder has independent membership and cursor state. Shared-drive
members use that drive's change log; non-members with individually shared folders
use the user's log. The selected folder and account are rechecked every 15
minutes, not on each change notification, so a folder that is trashed or moved
can keep reporting changes for up to 15 minutes. Coverage
is limited to the credential's actual grants; `drive.file` cannot observe every
file visible in the Google Drive UI. There is no claim of an all-drives stream.
A selected ID that is inaccessible, is not a folder, is a trashed folder, or is
an alias for another folder ID is skipped with a warning; the other selected
folders are still watched. Saved state is kept for the selected folders of the
connected account only, one entry per folder.

The 5,000-child limit bounds what is saved per folder: one ID and version per
child, about 300 KB for a full folder. Registration fails with a readable error
as soon as the baseline listing passes the limit, without listing the rest of the
folder.

If a watched folder later grows past the limit, the expansion that finds it
stops there: it returns no events, records a warning, and replaces the folder's
saved membership with an over-limit marker. The check runs once per bounded
read (up to 20 change pages) rather than per page, so a removal later in the
same read can offset an addition. While the marker is set:

- a notification returns no events and makes no Drive request for that folder;
- the 15-minute reconciliation lists the folder, stopping as soon as the limit
  is passed. If it is still too large, reconciliation fails with the same
  readable error and the saved state is unchanged. If it is back within the
  limit, that listing becomes a new silent baseline with a fresh change cursor,
  the marker is cleared, and a warning records that changes made while the
  folder was over the limit were not delivered.

`changes.watch` creates an HTTPS channel with a random verification token. Native
notifications must match the saved channel, resource, token, and live lease;
their body is not read. `sync` is acknowledged without a business event. That
check reads only the saved channel fields. The folder baseline saved at registration is validated
by the first authenticated expansion alone; afterwards the per-folder state is
authoritative and the saved baseline is not read again. It stays in the saved
registration because renewal cannot tell whether that first expansion has
happened, and dropping it earlier could misreport a file added in between.

Authenticated expansion reads up to 20 change pages (20,000 entries) per run and
returns events with updated state together. A longer backlog continues from the
saved page token, which Drive documents as non-expiring, on the next notification
or reconciliation. Failed pages do not advance the cursor. Event deduplication
uses account, corpus, folder, file ID, version and event kind, never the empty
legacy `changeId` field. Events carry every output field, including the account
verified during expansion, so mapping makes no further Drive request.

Channels request a seven-day lease and renew at 80% of the provider-confirmed
lifetime. Replacement channels retain unexpired overlap identities and the
original baseline. Scheduled reconciliation requests a catch-up every 15 minutes.
These guarantees require deployed runtime support for durable state, serialized
expansion, renewal, and reconciliation; package code alone does not provide it.
Drive documents non-expiring change tokens; an unexpected 410 defensively creates
a silent new baseline, with an explicit recovery diagnostic.

Only the creating Google account can clean up channels; Google also enforces the
creating OAuth client. Drive has no channel read/list API. A successful stop or
provider-confirmed lease expiry establishes cleanup; an active-channel 404 remains
retryable because it cannot establish absence. A lost watch response cannot be
looked up; an unrecorded channel expires within its requested lease.

Root trigger contracts cover native verification (including rejection without
reading a large saved baseline), activation races, pagination, the folder size
limit at registration, the over-limit marker and its recovery through
reconciliation, resumed backlogs, scope/corpus isolation,
removals, atomic cursor progress, request-free mapping, and lease overlap. The
live lifecycle scenario uses only a suite-owned folder and reserved `.invalid`
receiver, validates the watch response, creates and updates real children,
reconciles them, and stops the channels. It cannot prove callback delivery to a
deployed receiver or channel absence through readback.

Provider references: [push notifications](https://developers.google.com/workspace/drive/api/guides/push),
[user and shared-drive change logs](https://developers.google.com/workspace/drive/api/guides/about-changes),
[changes.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list),
[file versions](https://developers.google.com/workspace/drive/api/reference/rest/v3/files).
