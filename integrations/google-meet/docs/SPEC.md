# Google Meet integration specification

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

No Drive scopes are requested. Recording, transcript, and smart-note artifacts are returned as Google Drive file references; downloading the file bytes is done through a Google Drive connection.

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

- Space member methods are generally available through the Google Meet REST API v2 endpoint. Creating a member requires an email address; a user resource name alone is insufficient.
- Create, list, get, and delete members from a meeting space.

### Conference Records

Get a list of participants and participant sessions. Retrieve meeting and participant information for record purposes.

- List and retrieve conference records for past and ongoing meetings.
- View participants, including signed-in users, anonymous users, and phone users.
- Access individual participant sessions with join/leave times.
- The API is not intended for performance tracking or user evaluation within your domain.

### Meeting Artifacts (Recordings, Transcripts, Smart Notes)

Get meeting artifacts including recordings, transcripts, and transcript entries. Artifacts are saved to the meeting organizer's Google Drive.

- Retrieve recording metadata, including the Google Drive file reference of the recording.
- Retrieve transcript metadata and individual transcript entries (speaker, text, timestamps).
- Retrieve smart notes metadata and the generated Google Docs destination for a conference record.
- Artifacts are usually ready to be fetched soon after a conference ends.
- Downloading the actual recording or document files is done through a Google Drive connection using the returned file IDs; this integration requests no Drive scopes.

## Event triggers

The `meet_artifacts` group exposes `transcript_ready` and `recording_ready`.
It subscribes only to `google.workspace.meet.transcript.v2.fileGenerated` and
`google.workspace.meet.recording.v2.fileGenerated`. Recording or transcription
ending does not mean the output file has been generated.

Discovery resolves the connected Google user's stable ID and uses a single
user-target subscription. Google documents this target as covering meeting
spaces the user owns, and separately documents that invitees of a conference
also receive its transcript `fileGenerated` event. Events are therefore not
limited to owned meetings: a transcript of a meeting the user was invited to is
delivered when the user can read it. A recording event for a meeting the user
does not own is not documented; if one arrives it is treated the same way.
Artifacts require the appropriate Workspace recording/transcription entitlement
and actual use of the feature during the meeting.

### Delivery and lifecycle

- Google Workspace Events and Pub/Sub APIs must be enabled in the OAuth client's
  Cloud project. Delivery is set up once per OAuth client by whoever owns it,
  the service operator for the built-in client and a customer for their own,
  by following the guided setup: create a Pub/Sub topic in that project, allow
  `meet-api-event-push@system.gserviceaccount.com` to publish to it, create a
  service account for push authentication, and create a push subscription that
  uses the shown delivery URL as its endpoint and audience. They then select the
  OAuth client and save the topic name, subscription name, and push service
  account email; the service operator supplies the client ID of the built-in
  client. Nothing is created in Google Cloud automatically, and a user token is
  never used for this setup. A missing delivery setup fails activation with a
  setup error.
- One delivery topic and one authenticated push subscription serve every
  connection of the OAuth client. The delivery setup in use when the events
  were enabled is kept with the connection, and renewal fails if it has changed.
- Google permits one subscription per app, user, and target, and answers a
  second create with `ALREADY_EXISTS`. A subscription that already delivers to
  the configured topic is therefore adopted, confirmed against the expected
  target, user authority, and event types, and shared by every connection of
  that account. A newly created subscription is confirmed with a read.
- A subscription for the same account that delivers to any other topic belongs
  to another destination: the same OAuth client is also used elsewhere, or its
  delivery setup changed. It is never replaced, renewed, or deleted. Activation
  fails with a message saying that the account's meeting events are already
  delivered elsewhere, until that subscription is removed there.
- Each delivery is matched to its connections by the subscription named in its
  CloudEvent source. A connection accepts its current subscription and every
  earlier one still in its seven-day handover, at most 16 in total; renewal
  fails rather than exceed that bound.
- Uncertain creates are recovered by a fully paginated subscription list and
  exact topic, target, user authority, and event-type checks. The 100-page limit
  and repeated page tokens fail visibly rather than accepting an incomplete list.
- Subscriptions request a seven-day lease and are checked daily for renewal.
  Expiry is read from Google. Renewal reads current state, reactivates suspended
  subscriptions after their underlying problem is fixed, and recreates an absent
  subscription. Long-running operations must complete successfully; pending or
  failed operations remain retryable errors rather than reported success.
- Cleanup verifies ownership and uses the provider etag. It removes only the
  subscription saved for the connection: a different subscription on the same
  topic replaced it and stays in place for the connections using it. A complete
  authorized subscription list confirms removal, including repeated cleanup. An
  ambiguous 404 alone does not establish deletion. Cloud delivery resources have
  a separate owner and lifecycle.

### Event identity and output

Requests must pass Google's OIDC signature, issuer, expiration, audience and
verified push-account identity checks. The Pub/Sub subscription and CloudEvent
source must match those saved for the connection. Tokens legitimately issued up to
an hour ago are not rejected by an invented five-minute replay rule. Replacement
subscription sources are retained for seven days so queued valid messages can
finish processing.

The authenticated handler retrieves the named artifact and its conference. It
requires `FILE_GENERATED`, verifies resource and subject relationships, and emits
one artifact with its event ID/time, owner ID, conference and space resource
names, artifact name, state, optional start/end times, and document or recording
file ID and URL. Links do not confer permission to download; file contents and
transcript text are not included. Multiple artifacts in one conference are
independent events.

Persistent deduplication keys use owner and artifact resource name. Up to
10,000 artifacts are remembered for 31 days; beyond that the oldest are
forgotten, so new artifacts keep being reported. Events before subscription activation or older than
31 days are suppressed; a new subscription does not replay historical files. A
connection that adopts an existing subscription starts at its own activation
time, not at the subscription's creation time.

Hydration failures leave progress unchanged for retry: rate limits, server
errors, network failures, and a 403 caused by a missing scope, a disabled API,
or an exhausted quota all fail the attempt. A 404, or a 403 that concerns the
artifact or conference itself, means the connected account cannot read that
resource, which happens for meetings it does not own. That one event is skipped
with a warning, nothing is emitted or remembered for it, and later events are
unaffected.

### Delivery limits and verification

A 15-minute check inspects the user-target subscription and attempts to
reactivate suspension. If the saved subscription no longer exists (Google
answers 404 or reports it as deleted), for example because another connection
of the same account recreated the shared subscription under a new name,
the check records a warning and reports nothing instead of failing. The
connection adopts the replacement at its next renewal, at most a day later,
and receives no events until then. Permission, rate-limit, server, and network
errors still fail the check.

The check does not scan all accessible conference history: that history
includes every meeting the user attended, and nothing in it says which
artifacts Google would have reported for this trigger. Events missed
while the subscription is inactive, or beyond Pub/Sub retention, are not
promised as recovered. Use the existing history tools for a separately scoped
manual recovery workflow.

Offline tests cover signed delivery, source binding, readiness,
multiple artifacts, persisted deduplication, subscription lifecycle, shared
and foreign subscriptions, inaccessible artifacts, and failure recovery. The
live suite includes an explicitly fixture-gated lifecycle using a dedicated
test-account topic and a reserved `.invalid` audience. Real artifact
generation, exact event delivery, Workspace entitlement, Google's response
to a duplicate subscription, and its response for an artifact the account
cannot read remain live checks; passing offline tests is not evidence of
those checks.

### Provider references

- [Meet events and payloads](https://developers.google.com/workspace/events/guides/events-meet)
- [CloudEvent attributes and Pub/Sub encoding](https://developers.google.com/workspace/events#events_as_google_cloud_pubsub_messages)
- [Subscription resource and limits](https://developers.google.com/workspace/events/reference/rest/v1/subscriptions)
- [Create](https://developers.google.com/workspace/events/reference/rest/v1/subscriptions/create), [renew](https://developers.google.com/workspace/events/reference/rest/v1/subscriptions/patch), [reactivate](https://developers.google.com/workspace/events/reference/rest/v1/subscriptions/reactivate), [delete](https://developers.google.com/workspace/events/reference/rest/v1/subscriptions/delete), and [list](https://developers.google.com/workspace/events/reference/rest/v1/subscriptions/list)
- [Respond to Meet events](https://developers.google.com/workspace/meet/api/guides/events-overview)
