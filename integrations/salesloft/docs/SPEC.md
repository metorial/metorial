Let me get more details on the webhook event types and the API scopes/resources available.Let me get the full list of API resources and webhook event types.Let me try to fetch the webhook event types page and the Swagger API docs to get more details.Now I have enough information to create the specification. Let me compile what I've found.

# Slates Specification for SalesLoft

## Overview

SalesLoft is a sales engagement platform that helps sales teams manage outreach through cadences (multi-step communication sequences), track calls and emails, manage contacts (people) and accounts, and leverage AI-powered workflows via Rhythm. It provides a REST API (v2) for programmatic access to instance data including people, accounts, cadences, activities, tasks, conversations, and more.

## Authentication

SalesLoft supports three authentication methods:

### 1. OAuth 2.0 — Authorization Code Flow (Recommended)

SalesLoft uses OAuth 2.0 authorization flow to generate access tokens.

- Create apps via Salesloft Account → Your Applications → OAuth Applications → Create New.
- You will receive an **Application ID (Client ID)** and **Secret (Client Secret)**, plus configure a **Redirect URI**.
- Authorization endpoint: `https://accounts.salesloft.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code`
- Token endpoint: `https://accounts.salesloft.com/oauth/token`
- All API requests require the Authorization header set to `Bearer YOUR_ACCESS_TOKEN`. Access tokens are short-lived; use the refresh token to generate a new access token when it expires.
- Select scopes relevant to your application. Scopes control the data and actions an application can perform. Privileged scopes can access sensitive data.

### 2. OAuth 2.0 — Client Credentials Flow

SalesLoft allows the Client Credentials flow, which utilizes a server-to-server flow and does not require each end user to authenticate. This flow is recommended for background tasks, system-wide integrations, or when a service needs to access data on behalf of itself.

- The Client Credentials flow is enabled by an admin for private application use only, cannot be allowlisted, and assumes the permissions of the admin who created the application. This method is exclusively for customers, not partners.

### 3. API Key Authentication

Using an API key is a way outside of the OAuth flow to gain access to the Salesloft Public API. API Keys access the API on behalf of the issuing user.

- Create keys via Salesloft Account → Your Applications → API Keys → Create New. Input a descriptive name and select the scopes you need.
- API Keys take the form "ak" followed by a 64-character hexadecimal string (e.g., `ak_de656ec86bcab24878c24ff4d86758f8963d8ea6bcd4e90f8fae846ba8f9ac62`).
- Passed via the HTTP Authorization header: `Authorization: Bearer YOUR_API_KEY`.
- OAuth is the preferred authentication method for partners. Partner applications submitted using API Keys will not be approved.

### Scopes

Scopes are used to manage access to SalesLoft data via the API. They represent specific permissions, allowing applications to request only the necessary data and actions, ensuring secure and granular access control.

Key scopes include `person:read`, `person:write`, `account:read`, `account:write`, and others corresponding to specific resources. Privileged scopes include:

- `email_contents:read` — Read email bodies and subjects.
- `crm_id_person:write` — Write to the CRM ID field of the Person object.
- `crm_id_account:write` — Write to the CRM ID field of the Account object.
- `data_control:read` / `data_control:write` — Read/write data redaction requests.
- `external_emails:write` — Write MIME emails for reply tracking processing.

## Features

### People (Contacts) Management

A Person is an individual being reached out to through the SalesLoft platform. Users can email, call, and execute social steps on people. The API provides endpoints to get, create, and update Person objects. People can be filtered by tags, cadence membership, custom fields, job seniority, and more. People also have contact restriction fields (do-not-contact, do-not-email, do-not-call).

### Account (Company) Management

An Account (Company) contains information about the company that people work for, including information about the people who work for the company. Accounts can be created, updated, listed, and filtered (e.g., by website or custom fields).

### Cadence Management

A Cadence defines how communication happens. For example, a "7x7" cadence where 7 touches happen over 7 days, consisting of call, email, or other steps. The API provides endpoints to list all cadences for a user or team.

- PersonCadenceMembership is used to add a Person to a Cadence.
- Cadences can be exported and imported via the API. Exported cadences contain agnostic content that can be imported into any SalesLoft instance, with or without content.

### Activity Tracking (Emails & Calls)

SalesLoft provides two endpoints for call data: "call" and "call data record." The combined use of these endpoints provides access to all phone call data. Email activities can also be retrieved, including sent emails, opens, clicks, replies, and bounces.

### Actions & Tasks

Actions are a central concept in SalesLoft. An Action denotes a scheduled event between a user and one of their people, with types including email, call, or "other." Tasks can be created and managed through the API.

### Email Templates

Email templates can be listed, filtered by title or subject, and managed. Templates can be designated as cadence-specific or generally available in the SalesLoft application.

### Conversations

The API provides endpoints for Conversations. Conversations can be filtered, paged, and sorted. Conversations relate to SalesLoft's meeting recording and transcription capabilities.

### Signals & Rhythm Integration

A self-service open API enables third parties and customers to inject data into SalesLoft and trigger custom Rhythm workflows. The Signals API allows sending buyer signals (e.g., content engagement, intent data) attributed to people or accounts, with configurable urgency levels and indicators. These signals are prioritized by Conductor AI and turned into seller actions.

### External ID Mapping

When requesting People using external IDs, SalesLoft resolves the association to SalesLoft IDs and returns the objects. Similarly, when upserting People or Accounts, it resolves the association and upserts with the request payload. This enables syncing records between SalesLoft and external systems using your own identifiers.

### Users & Team Management

The API provides access to user data within a SalesLoft team, including listing team members and fetching individual user details.

### Tags

Tags can be viewed through the SalesLoft API, allowing you to read labels applied to people and other resources.

### Third-Party Dialer Integration

SalesLoft offers two ways to integrate third-party dialers: Voice Links and Webhooks.

### Imports

The API supports importing people from external sources and managing import records.

## Events

SalesLoft supports webhooks that allow you to receive event-specific notifications by subscribing to SalesLoft events. When an event is triggered, SalesLoft sends an HTTP POST payload to the webhook subscription's configured URL.

Webhook subscriptions are made on behalf of a team. Once installed, the webhook is triggered each time one or more subscribed events occur. To subscribe, use the Webhook Subscriptions API endpoints with a valid OAuth token or API key.

Based on available documentation and integration references, the following event categories are supported:

### Person Events

- Triggers when an event occurs for a person. Supports created, updated, and deleted person events.

### Account Events

- Triggers when an event occurs for an Account. Supports created, updated, and deleted Account events.

### Cadence Events

- Triggers when an event occurs for a Cadence. Supports created, updated, and deleted Cadence events.

### Meeting Events

- Triggers when an event occurs for a Meeting. Supports created and updated Meeting events.

### Call Events

- Triggers when an event occurs for a Call. Supports created and updated Call events.

### Note Events

- Triggers when an event occurs for a Note. Supports created, updated, and deleted Note events.

### Task Events

- Triggers when an event occurs for a task.

The webhook event types have associated permissions. When subscribing to an event that emits data for a particular resource, the authorized user must have the correct permissions or the corresponding data will not be available.
