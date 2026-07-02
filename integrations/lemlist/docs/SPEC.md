Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Lemlist

## Overview

Lemlist is a sales engagement and outreach platform for creating and automating personalized email and LinkedIn campaigns. It provides tools for lead management, multichannel sequences (email, LinkedIn, phone), contact enrichment, email warmup (lemwarm), and a people database for prospecting. The API base URL is `https://api.lemlist.com/api`.

## Authentication

Lemlist supports API key authentication with two methods:

1. **HTTP Basic Authentication**: Uses Basic auth with an empty username and the API key as the password. The `Authorization` header is set to `Basic <encoded-value>`, where `<encoded-value>` is the base64 encoding of `:YOUR_API_KEY` (note the empty username before the colon). Example: `Authorization: Basic <base64(:YOUR_API_KEY)>`.

2. **Bearer Token Authentication**: Some endpoints accept the API key as a Bearer token. The header is set to `Authorization: Bearer YOUR_API_KEY`.

API keys are generated in the Lemlist app under **Settings > Integrations**. Keys are only shown once upon creation and cannot be retrieved later. Users can create multiple API keys with descriptive names for different integrations.

Do not include the API key in query parameters, the JSON body, or custom headers like `Api-Key` or `x-api-key`.

## Features

### Campaign Management

Create, list, update, and manage outreach campaigns. Campaigns contain multichannel sequences (email, LinkedIn, phone) and can be started, paused, or resumed. Campaign statistics and reports are available.

### Sequence & Schedule Configuration

Define and manage the steps within a campaign sequence (e.g., email steps, LinkedIn steps, call steps). Configure sending schedules to control when outreach activities are executed.

### Lead Management

Add, retrieve, update, and delete leads within campaigns. Leads can be added individually or in bulk. Leads can be marked with statuses like interested or not interested. Leads can be looked up by email across campaigns.

### Company Management

Create and manage company records. Companies can be associated with leads and enriched with notes.

### Contact Management

Manage contacts independently of campaigns as a centralized contact database.

### Unsubscribe Management

Add or remove leads from the global unsubscribe list. Retrieve all unsubscribed contacts to maintain compliance.

### Activity Tracking

Retrieve activity logs for campaigns and leads, including email sends, opens, clicks, replies, bounces, LinkedIn interactions, and phone calls.

### Inbox Management

Access and manage inbox conversations and messages for replies received from leads.

### Task Management

Retrieve and manage tasks (e.g., manual steps in a sequence such as phone calls or LinkedIn actions that require human intervention).

### People Database & Enrichment

Search a built-in people database for prospecting by filtering on criteria like job title, company, location, and industry. Enrich lead data with email addresses, phone numbers, and LinkedIn profile information. Enrichment consumes credits.

### Email Account Management

Manage connected email accounts (mailboxes) used for sending outreach.

### CRM Integration

Manage CRM filters and sync configurations for pushing data to connected CRMs.

### Lemwarm (Email Warmup)

Configure and manage email warmup settings for connected email accounts to improve deliverability.

### Watch List / Signals

Monitor signals and events related to tracked companies or prospects.

### Team & User Management

Retrieve team information, manage users, and check credit balances.

## Events

Lemlist supports webhooks that deliver real-time POST callbacks when events occur. Webhooks are created via the API by specifying a target URL and an optional event type. If no type is specified, all events are sent to the webhook.

Webhooks can optionally be scoped to a specific campaign and configured to fire only on the first occurrence of an event.

### Email Activity Events

Notifications for email lifecycle events: sent, opened, clicked, replied, bounced, send failed, failed, unsubscribed, marked as interested, and marked as not interested.

### LinkedIn Activity Events

Notifications for LinkedIn interaction events: profile visit done/failed, invite sent/failed, invite accepted, message sent, reply received, voice note done/failed, marked as interested, marked as not interested, and send failed.

### Phone/Aircall Activity Events

Notifications for call events: call created, call ended, call done, marked as interested, and marked as not interested. Also includes call recording done and call transcript done events.

### API-Triggered Activity Events

Notifications for activities triggered via the API: done, interested, not interested, and failed.

### Campaign Lifecycle Events

Notifications for campaign state changes: contacted, hooked, attracted, warmed, interested, skipped, not interested, paused, resumed, and campaign complete.

### Operational Alert Events

Notifications for system issues and limits: custom domain errors, connection issues, send limit reached, and lemwarm paused.

### Enrichment Events

Notifications for when lead enrichment completes successfully or encounters an error.

### Other Events

Annotation events (`annotated`) and manual interest marking events (`manualInterested`, `manualNotInterested`).
