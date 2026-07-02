Now let me try to fetch the webhooks page directly:I have enough information from the initial fetch and searches to compile the specification.

# Slates Specification for Leexi

## Overview

Leexi is an AI notetaker that transcribes, analyzes, and summarizes your calls and meetings. It is a conversational intelligence platform based on call transcription technology, supporting video conferencing platforms (Zoom, Google Meet, Microsoft Teams) and VoIP integrations. It automates the capture and summarization of meetings in over 120 languages.

## Authentication

Authentication is based on API Key ID and Key Secret. The API Key ID and Key Secret is passed via HTTP Basic Authentication. This means Leexi expects to find an Authorization header with "Basic " and then KEY_ID:KEY_SECRET encoded in base 64.

**Generating credentials:**
You can generate an API key/secret pair by going to Leexi → Settings → Company Settings → API Keys, and clicking on _add_ (requires a Leexi admin account).

**Base URL:** `https://public-api.leexi.ai/v1/`

**Example:**

```
Authorization: Basic <base64(KEY_ID:KEY_SECRET)>
```

Where `KEY_ID:KEY_SECRET` is base64-encoded. For example, if your Key ID is `KEY_ID` and Key Secret is `KEY_SECRET`, the base64 encoding of `KEY_ID:KEY_SECRET` is `S0VZX0lEOktFWV9TRUNSRVQ=`, and the header becomes:

```
Authorization: Basic S0VZX0lEOktFWV9TRUNSRVQ=
```

Note: API keys are not subject to access rules and give access to all calls in the related company account.

## Features

### User Management

List all users in your Leexi workspace. Use the "LIST users" endpoint to find the user_uuid to use in other requests. Users are identified by UUID.

### Team Management

List all teams in your Leexi workspace. Useful for understanding organizational structure and filtering data by team.

### Call and Meeting Retrieval

List all calls and meetings in your workspace. Getting a single call or meeting returns call topics and the call transcript. The simple_transcript has paragraph-level timestamps, while the transcript also has word-level timestamps.

- Prompt completions (summary, chaptering, etc.) are not immediately available on call creation, but get added later on.
- You can retrieve transcripts, summaries, and other AI-generated content.

### Call Creation

Create a call or meeting asynchronously (creation time is typically a few minutes). You must first finish uploading the recording of the call using a presigned recording URL retrieved with the presigned URL endpoint.

- The workflow requires first requesting a presigned URL, uploading the recording file to that URL, and then creating the call record referencing the uploaded recording.
- Requires a valid `user_uuid` (obtainable from the users endpoint).

### Presigned URL for Recording Upload

Request a presigned URL for uploading a call recording before creating the call. This is a prerequisite step for creating calls with audio recordings.

### Meeting Event Management

Manage meeting events that represent scheduled meetings where the Leexi assistant should join. You can:

- List and retrieve meeting events in your workspace.
- Create a new meeting event in Leexi with timing, participants, and recording preferences. Parameters include meeting URL, start/end time, organizer, attendees, title, description, and flags for ownership, internal status, and recording preference.
- Delete a specific meeting event by UUID.

### Launch Meeting Assistant

Trigger the Leexi meeting assistant to join an active meeting. This allows programmatic control over when the AI notetaker joins a conference.

## Events

Leexi supports webhooks for receiving real-time notifications about activity in your account. Based on the API documentation, the following webhook event is available:

### Call Processed

A webhook event that fires when a call has been fully processed by Leexi. This is useful for being notified when transcripts, summaries, and other AI-generated content become available for a call, since these are generated asynchronously after call creation.

Webhook configuration details (such as the registration endpoint or setup process) are managed through the Leexi API's webhooks section. The webhook delivers event data via HTTP POST to a registered URL.
