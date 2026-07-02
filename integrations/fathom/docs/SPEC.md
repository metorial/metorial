I see there are multiple products called "Fathom" — Fathom Analytics (website analytics), Fathom Global (flood risk data), and Fathom AI (meeting recorder). Given that "Fathom" most commonly refers to the AI meeting recorder (fathom.video / developers.fathom.ai), and it has a developer API with webhooks, let me research that one more specifically.Now let me get the webhook payload details and the full API reference:I now have enough information to write the specification. Let me compile everything.

# Slates Specification for Fathom

## Overview

Fathom is an AI meeting assistant that joins Zoom, Google Meet, and Microsoft Teams calls to automatically record, transcribe, and summarize meetings. It generates AI-powered meeting notes, action items, and summaries, and can sync meeting data to CRMs like HubSpot and Salesforce.

## Authentication

Fathom supports two authentication methods:

### API Key Authentication

Users generate a personal API key from their Fathom dashboard under **Settings → API Access**. The key is passed via the `X-Api-Key` header on every request:

```
curl https://api.fathom.ai/external/v1/meetings \
  -H "X-Api-Key: YOUR_API_KEY"
```

API keys are user-scoped: they can only access meetings recorded by the user or shared to their team. Admin keys do not grant access to other users' unshared meetings.

### OAuth 2.0 (Authorization Code Flow)

For public integrations intended for multiple Fathom users, OAuth 2.0 is required. Developers must first register an OAuth app at `https://fathom.video/marketplace_applications/new` to obtain a Client ID and Client Secret.

- **Authorization URL:** Generated via SDK or manually constructed to redirect users.
- **Token endpoint:** `https://api.fathom.ai/external/v1/oauth2/token`
- **Redirect URI:** Must be HTTPS; configured during app registration.
- **Grant types:** `authorization_code` and `refresh_token`.
- **Scopes:** The only available scope is `public_api`.
- Access tokens are short-lived. Refresh tokens are single-use and remain valid until the user revokes access or the token is consumed.

OAuth apps have some limitations compared to API key access: they cannot use `include_transcript` or `include_summary` inline when listing meetings and must fetch transcripts and summaries separately via dedicated endpoints.

## Features

### Meeting Retrieval

List and retrieve meetings recorded by the user or shared to their team. Meetings include metadata such as title, scheduled and actual recording times, meeting type (internal/external), calendar invitees, and who recorded the meeting. Filtering is available by:

- Recorder email addresses
- Team names
- Calendar invitee email addresses
- Calendar invitee domains (with options: all, only internal, one or more external)
- Date range (`created_after`, `created_before`)
- Meeting type

### Transcripts

Retrieve speaker-labeled, timestamped transcripts for individual meeting recordings. Each transcript entry includes the speaker's display name, matched calendar invitee email, spoken text, and timestamp. Transcripts can be included inline when listing meetings (API key auth only) or fetched separately per recording. Supports asynchronous delivery via callback URL.

### Meeting Summaries

Retrieve AI-generated summaries for specific recordings in Markdown format. Summaries are associated with a template name (e.g., "general"). Like transcripts, summaries can be included inline (API key auth only) or fetched per recording. Supports asynchronous delivery via callback URL.

### Action Items

Access AI-extracted action items from meetings, including description, assignee (name, email, team), completion status, and a link to the relevant moment in the recording. Action items can be included when listing meetings.

### CRM Matches

Retrieve CRM-matched data for meetings, including matched contacts, companies, and deals (with name, amount, and CRM record URL). Requires the user to have a CRM connected in Fathom. CRM match data can be included when listing meetings or in webhook payloads.

### Team Management

List teams accessible to the authenticated user and retrieve team members with optional filtering by team name.

### Webhook Management

Create and delete webhooks programmatically. When creating a webhook, you specify a destination URL, which recording types should trigger it (`my_recordings`, `shared_team_recordings`), and what data to include in the payload (transcript, summary, action items, CRM matches). A webhook secret is returned for signature verification.

## Events

Fathom supports webhooks that deliver meeting data to a specified URL after meetings are processed.

### New Meeting Content Ready

Fires when a recorded meeting has been fully processed and its content (transcript, summary, action items) is available. This is the primary (and currently only) webhook event type.

- **Trigger configuration:** Can be set to fire for the user's own recordings, recordings shared to their team, or both.
- **Payload configuration:** You choose which data to include in the webhook payload:
  - Transcript
  - Summary
  - Action items
  - CRM matches
- **Verification:** Each webhook request includes `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers. The signature is an HMAC-SHA256 hash using the webhook secret provided at creation time, allowing receivers to verify authenticity and prevent replay attacks.
