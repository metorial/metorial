# Slates Specification for Google Meet

## Overview

Google Meet is a video conferencing service by Google, part of Google Workspace. The Google Meet REST API lets you create and manage meetings and offers entry points to users directly from your app. A separate Media API (in Developer Preview) provides access to raw audio and video streams during a meeting.

## Authentication

The Google Meet REST API uses OAuth 2.0 with a user's Google credentials. Authenticating and authorizing with user credentials lets Meet apps access user data and perform operations on the authenticated user's behalf. The app has the same permissions as that user and can perform actions as if they were performed by that user.

For the Meet REST API, you can only authenticate using user authentication.

**Prerequisites:**

- A Google Cloud project with the Google Meet REST API enabled.
- A Google Workspace account with Google Meet enabled.
- OAuth 2.0 client credentials (Client ID and Client Secret) configured in the Google Cloud console.

**OAuth 2.0 Scopes:**

| Scope                                                     | Description                                                                 | Sensitivity   |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | ------------- |
| `https://www.googleapis.com/auth/meetings.space.created`  | Create, modify, and read metadata about meeting spaces created by your app. | Sensitive     |
| `https://www.googleapis.com/auth/meetings.space.readonly` | Read metadata about any meeting space the user has access to.               | Sensitive     |
| `https://www.googleapis.com/auth/meetings.space.settings` | Edit and see the settings for all Google Meet calls.                        | Non-sensitive |
| `https://www.googleapis.com/auth/drive.readonly`          | Download recording and transcript files from Google Drive.                  | Restricted    |
| `https://www.googleapis.com/auth/drive.meet.readonly`     | View Drive files created or edited by Google Meet.                          | Restricted    |

**Domain-Wide Delegation:**

Domain administrators can grant domain-wide delegation of authority to authorize an application's service account to access users' data without requiring each user to give consent. After configuring domain-wide delegation, the service account can impersonate a user account. Although a service account is used for authentication, domain-wide delegation impersonates a user and is therefore considered user authentication. Any capability that requires user authentication can use domain-wide delegation.

**Base URL:** `https://meet.googleapis.com`

## Features

### Meeting Space Management

Create meeting spaces to connect users over video, and retrieve meeting spaces by resource name or meeting code. You can set how users join a meeting, the moderation modes, the feature restrictions, and the permissions users receive when they join a meeting.

- Spaces are identified by a unique meeting ID and a human-readable meeting code (e.g., `abc-mnop-xyz`).
- Configure entry point access — set to allow all entry points or only those owned by the Google Cloud project that created the space.
- Set moderation modes to give the meeting organizer control over features such as co-host management and feature restrictions.
- Pre-configure auto artifacts (auto-recording, auto-transcripts, smart notes) when creating or updating a meeting space. Requires the `meetings.space.settings` scope.
- Meeting codes expire 365 days after last use and should not be stored long term.

### Space Member Management

A space member is a user configured to have a role in the meeting space. These users can join the meeting space without requesting permission ("knocking"). While meeting organizers can automatically enter the meeting space, additional members can be configured to join without knocking. Members can be configured to have a role such as COHOST, which gives them the same abilities to manage the meeting as the meeting organizer.

- Space member methods are available through the Google Workspace Developer Preview v2beta endpoint.
- Create, list, get, and delete members from a meeting space.

### Conference Records

Get a list of participants and participant sessions. Retrieve meeting and participant information for record purposes.

- List and retrieve conference records for past and ongoing meetings.
- View participants, including signed-in users, anonymous users, and phone users.
- Access individual participant sessions with join/leave times.
- The API is not intended for performance tracking or user evaluation within your domain.

### Meeting Artifacts (Recordings, Transcripts, Smart Notes)

Get meeting artifacts including recordings, transcripts, and transcript entries. Artifacts are saved to the meeting organizer's Google Drive.

- Retrieve recording metadata and download recording files via Google Drive.
- Retrieve transcript metadata and individual transcript entries (speaker, text, timestamps).
- Retrieve smart notes metadata and the generated Google Docs destination for a conference record.
- Artifacts are usually ready to be fetched soon after a conference ends.
- Downloading the actual files requires the `drive.readonly` or `drive.meet.readonly` scope.

## Events

The Google Workspace Events API enables subscribing to Google Meet events to receive real-time updates about conferences, participants, recordings, and transcripts. Your app receives events through Google Cloud Pub/Sub after subscribing to a specific Google Workspace resource.

To receive events, you specify a Meet resource to monitor (the target resource). The Google Workspace Events API supports subscribing to a specific meeting space or to a user (to receive events for all meeting spaces the user owns or organizes).

### Conference Events

Receive events when a conference starts or ends in a meeting space.

- Event types: `google.workspace.meet.conference.v2.started`, `google.workspace.meet.conference.v2.ended`

### Participant Events

Receive events when a participant joins or leaves a conference.

- Event types: `google.workspace.meet.participant.v2.joined`, `google.workspace.meet.participant.v2.left`

### Recording Events

Receive events when a recording starts, ends, or a file is generated for a conference.

- Event types: `google.workspace.meet.recording.v2.fileGenerated`

### Transcript Events

Receive events when a transcript starts, ends, or a file is generated for a conference.

- Event types: `google.workspace.meet.transcript.v2.fileGenerated`

### Smart Notes Events

Receive events when a smart note starts, ends, or a file is generated for a conference (Developer Preview).

### Important Considerations

- The Google Workspace Events API supports Google Cloud Pub/Sub topics as the notification endpoint. You must have a Pub/Sub topic configured to receive events.
- Calendar invitees and other participants invited to a conference can only receive conference started and transcript file generated events.
- The Events API uses scopes from Google Workspace applications that support subscriptions. If your app already uses the required Meet scopes, you don't need to add additional scopes for the Events API.
