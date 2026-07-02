# Slates Specification for Callingly

## Overview

Callingly is a call automation platform that connects sales teams with incoming leads by automatically initiating phone calls when new leads are captured from CRMs, landing pages, or web forms. It supports automated call retries, SMS messaging, call recording, whisper text for agents, and syncs call data back to connected CRMs.

## Authentication

Callingly uses **API key (Bearer Token)** authentication.

To generate an API key:

1. Navigate to **Settings → API Keys** in the Callingly dashboard.
2. Click "Add API Key" and give it a name.
3. Copy and securely store the key — it cannot be viewed again after creation.

Every API request requires two headers:

- `Authorization: Bearer {API_KEY}`
- `Accept: application/json`

**Agency partners** managing multiple client accounts can pass an additional `account_id` parameter with requests to act on behalf of a specific client account. The client's account ID can be found via the Clients API or in the Callingly dashboard.

## Features

### Lead Management

Create, retrieve, update, and delete leads. Leads include contact details (name, email, phone number), company info, category, source, status, result, tags, stage, and assigned lead owner. Leads can be stopped or blocked from receiving calls. Leads can be filtered by date range and phone number.

### Call Management

Initiate calls by creating a call with lead contact details and assigning it to a team. Calls can be scheduled for a future time using the `scheduled_at` parameter. Retrieve individual call details including status, duration, recording URL, transcript, call direction (inbound/outbound), and the associated agent and lead. List calls with filtering by date range and team.

### SMS Messaging

Send SMS messages to leads from a specified phone number. Messages support personalization templates (e.g., `{{lead.first_name}}`, `{{from.company}}`) with default fallback values. Both sender and recipient phone numbers are required, preferably in E.164 format.

### Team Management

Create, update, and list teams. Teams have configurable settings including:

- **Call mode** (e.g., simultaneous ringing of agents).
- **Whisper text** — customizable message agents hear before connecting, with variable placeholders for lead info.
- **Post-whisper text** — message after a call for disposition (contacted, voicemail, reschedule).
- **Retry settings** — number of retries and retry schedule (in minutes) for both agent-side and lead-side retries.
- **Call recording** toggle.
- **Call delay** before initiating.
- **Language** and voice settings.
- **SMS auto-send** toggle with customizable body.

### Agent (User) Management

Create, update, and delete agents. Manage agent properties including phone number, extension, timezone, priority, and do-not-disturb mode (with optional expiration time). View agent availability status.

### Agent Scheduling

Retrieve and update per-agent weekly availability schedules. Each day can be toggled available/unavailable and supports multiple time windows (e.g., morning and afternoon shifts).

### Team Agent Assignment

List agents assigned to a team (with priority and cap settings), assign or remove agents from teams, and update individual agent settings within a team (priority level and lead cap).

### Client Management (Agency)

For agency partners: list, create, delete, and activate/deactivate client accounts. Each client has their own account with separate billing for users and phone numbers.

## Events

Callingly supports outbound webhooks that can be managed via the API. Webhooks fire HTTP POST requests to a specified target URL when events occur.

### Call Completed

Fires when a call has been completed. Can be filtered by:

- **Call direction**: inbound or outbound.
- **Call status**: completed, missed, or offline.
- **Lead status**: contacted, missed, removed, or voicemail.
- **Team ID** (for outbound calls) or **Number ID** (for inbound calls).

### Lead Created

Fires when a new lead is created. Can be filtered by:

- **Field**: only trigger when a specific lead field is present (lead_owner, result, stage, status, or tags).
- **Filter**: only trigger when the specified field matches a given value.

### Lead Updated

Fires when a lead is updated. Can be filtered by:

- **Field**: only trigger when a specific lead field has changed (lead_owner, result, stage, status, or tags).
- **Filter**: only trigger when the changed field matches a given value.
