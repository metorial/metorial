# Slates Specification for Recall.ai

## Overview

Recall.ai is a unified API for capturing recordings, transcripts, and metadata from video conference meetings across platforms like Zoom, Google Meet, Microsoft Teams, Webex, Slack Huddles, and GoTo Meeting. It offers three capture methods: meeting bots that join calls as participants, a Desktop Recording SDK for botless recording, and a Mobile Recording SDK. It also provides calendar integrations to automatically schedule recording bots based on upcoming events.

## Authentication

Recall.ai uses API key-based authentication via a `Token` scheme.

- **API Key**: Generated from the Recall.ai dashboard under the API Keys page.
- **Header format**: `Authorization: Token <API_KEY>`
- **Regional base URLs**: API requests must be directed to the region associated with your account. Available regions include `us-west-2`, `us-east-1`, `eu-central-1`, and `ap-northeast-1`.
- **Base URL pattern**: `https://<REGION>.recall.ai/api/v1/`

Example request:

```
curl -X POST https://us-west-2.recall.ai/api/v1/bot \
  -H 'Authorization: Token YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

There is no OAuth2 flow or scoped permissions. A single API key grants access to all resources within the associated environment.

## Features

### Meeting Bot Management

Create, schedule, and manage bots that join video conference meetings as participants. Bots can capture participant names and IDs, transcripts, audio, video, MP4 recordings, participant emails, screenshare data, chat messages, and meeting metadata. Bots can be white-labeled with custom names. In production, bots should be scheduled in advance using a `join_at` parameter rather than created last minute. Bots support automatic leaving behavior and detection of other bots in the meeting.

### Recording and Media Capture

Capture meeting recordings in multiple formats: mixed video+audio MP4, mixed audio MP3, separate audio per participant, and separate video per participant. Recordings are available both asynchronously (after the meeting) and in real-time via streaming. Real-time audio can be streamed as raw PCM and real-time video as PNG frames or H264. Supports RTMP streaming for mixed video+audio.

### Transcription

Generate transcripts using multiple providers: Recall.ai's own transcription, AssemblyAI, AWS Transcribe, Deepgram, Rev, Speechmatics, or meeting platform captions. Transcription is available both in real-time (streamed during the meeting) and asynchronously (after the meeting ends). Supports multilingual transcription, speaker diarization, and perfect diarization (matching transcript segments to identified participants).

### Output Media (Interactive AI Agents)

Use the Output Media feature to have your bot respond directly in meetings. You can feed AI agents real-time chat messages, plus audio/video from participants, so their responses are context-aware and relevant. Bots can output images or video via their camera/screenshare feed, and output speech/audio into the meeting. This enables building interactive AI agents, real-time translators, and avatar-based participants.

### Chat Messages

Send and read chat messages within meetings through the bot. This allows bots to participate in meeting chat programmatically.

### Calendar Integration

Connect to Google Calendar and Microsoft Outlook to automatically detect upcoming meetings and schedule bots. Calendar webhooks notify you about changes to calendars and their events, which you use to schedule bots and delete them according to your application logic. Supports two versions (V1 with managed scheduling preferences, V2 with full developer control over scheduling logic).

### Desktop Recording SDK

Integrate recording directly into existing desktop applications for both virtual and in-person meetings. Captures full meeting audio, video, system audio, screen share, and participant context without requiring a bot to join the call. Supports real-time transcription and audio streaming.

### Meeting Direct Connect

A botless integration path using native platform APIs such as Zoom RTMS and Google Meet Media API, allowing meeting data capture without a visible bot participant.

### Signed-In Bots

Bots can authenticate as specific users on Zoom, Google Meet, and Microsoft Teams, which can help bypass waiting rooms and access meetings that require authentication.

### Meeting Participants and Metadata

Access participant information including names, emails, join/leave events, and host status. Retrieve meeting metadata such as meeting title and platform-specific data. Supports unique participant identification across sessions.

## Events

Recall.ai supports webhooks for multiple event categories. Global webhooks are configured in the Recall dashboard and delivered via Svix. Real-time webhooks are configured per-bot at creation time and delivered directly.

### Bot Status Change Events

Sent whenever the bot's status changes. Statuses include `bot.joining_call`, `bot.in_waiting_room`, `bot.in_call_not_recording`, `bot.recording_permission_allowed`, `bot.recording_permission_denied`, `bot.in_call_recording`, `bot.call_ended`, `bot.done`, and `bot.fatal`. Also includes `bot.output_log` for fatal errors with transcription providers. Configured globally via the dashboard.

### Recording Lifecycle Events

Sent whenever a recording's status changes. Events include `recording.processing`, `recording.done`, `recording.failed`, and `recording.deleted`.

### Media Object Events

Sent whenever a media object's status changes. Supported media objects include `participant_events`, `transcript`, `video_mixed`, `video_separate`, `audio_mixed`, and `audio_separate`. Each has statuses like `processing`, `done`, `failed`, and `deleted`.

### Real-Time Events (Per-Bot)

Configured at bot creation time via `realtime_endpoints`. Available events include:

- **Participant events**: `participant_events.join`, `participant_events.leave`, `participant_events.chat_message`, `participant_events.speech_on`, `participant_events.speech_off`, `participant_events.update`
- **Transcript data**: `transcript.data` (final transcription segments) and `transcript.partial_data` (interim/partial results)
- **Audio streaming**: `audio_mixed_raw.data` (mixed audio) and `audio_separate_raw.data` (per-participant audio)
- **Video streaming**: `video_separate_png.data` (PNG frames) and `video_separate_h264.data` (H264 frames)

These can be delivered via webhook URLs or WebSocket connections.

### Desktop Recording SDK Events

Lifecycle webhooks for Desktop SDK uploads, delivered via Svix:

- `sdk_upload.recording_started` — recording has begun
- `sdk_upload.recording_ended` — recording has finished
- `sdk_upload.complete` — upload finished successfully
- `sdk_upload.failed` — upload finished unsuccessfully

### Calendar Events

- **`calendar.update`** — sent when a calendar's data changes (e.g., status becomes disconnected due to token revocation).
- **`calendar.sync_events`** — sent when calendar events are created, updated, or deleted. Includes a `last_updated_ts` to fetch only changed events.
