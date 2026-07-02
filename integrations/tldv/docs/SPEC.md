Let me get more details from the API documentation page.# Slates Specification for Tldv

## Overview

tl;dv is an AI meeting notetaker that records, transcribes, and summarizes video calls on Zoom, Google Meet, and Microsoft Teams. It provides an API to retrieve meeting data, transcripts, and AI-generated highlights, as well as import external recordings.

## Authentication

tl;dv uses API key authentication. To obtain an API key, navigate to https://tldv.io/app/settings/personal-settings/api-keys (requires being logged in) and generate a new API key.

Once you have the API key, include it in the header of all API requests using the `x-api-key` header:

```
x-api-key: YOUR_API_KEY
```

All API requests must be made over HTTPS. Requests made over plain HTTP will be rejected.

**Base URL:** `https://pasta.tldv.io`

The API key is available to users on the Business Plan or higher. The API follows the same underlying permission model as the web application, with additional plan-based constraints applied to automation and export capabilities. Meetings organized by Free plan users are not accessible via the API, even if shared.

## Features

### Meeting Retrieval

Retrieve a list of your recorded meetings or get details for a specific meeting. Meetings include metadata such as name, date, duration, organizer, invitees, conference ID, and the applied note template. Meetings can be filtered by query, date range, participation status, and type (internal/external).

### Recording Download

Download meeting recording files via a signed, expiring download URL. The signed URL expires 6 hours after issuance.

### Transcripts

Retrieve the full transcript of a meeting in a structured format. Transcripts include speaker identification, text content, and timestamps (start/end time) for each segment. Transcripts are only available once processing is complete.

### Highlights / Notes

Retrieve AI-generated highlights (notes) for a meeting. Each highlight includes the text, a start time, the source (manual or AI-generated), and an associated topic with a title and summary. Highlights are only available after the transcript is complete.

### Meeting Import

Import a meeting, recording, or other media from a URL. The URL must be publicly accessible, and the media must be in a supported format. This allows ingesting external recordings into tl;dv for transcription and analysis.

## Events

Webhooks allow you to receive real-time notifications from tl;dv when key events occur in your workspace.

Webhooks are configured in the tl;dv account under Settings > Webhooks, by specifying an Event Action and an HTTPS Endpoint URL. Optionally, you can configure custom headers (e.g., auth tokens) to be included in the webhook request.

Webhooks can be configured at different levels, depending on your needs: User level (only events for that individual user), Team level (events for all users in a specific team), or Organization level (all events across the entire organization).

### MeetingReady

Fires when a meeting has finished processing and is ready to be consumed. The payload includes meeting metadata such as ID, name, date, organizer, invitees, URL, template, and duration.

### TranscriptReady

Fires when a meeting transcript has been generated and is available. The payload includes the full transcript data with speaker segments, timestamps, and text content.
