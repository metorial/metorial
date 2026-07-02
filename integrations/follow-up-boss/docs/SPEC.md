Let me get more details on the full list of webhook events and API resources available.Now I have comprehensive information. Let me also check the OAuth flow details.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Follow Up Boss

## Overview

Follow Up Boss is a real estate CRM platform that helps agents and teams manage leads, track communications, automate follow-ups, and manage deals/transactions. It integrates with lead sources, IDX websites, and various real estate tools to centralize contact and pipeline management.

## Authentication

Follow Up Boss supports two authentication methods:

### 1. API Key (Basic Authentication)

There are two ways to authenticate and authorize with Follow Up Boss: OAuth and Basic Authentication via API Key. If you are using API Keys to authenticate with Follow Up Boss, you must use Basic Authentication.

- Every user in Follow Up Boss has a unique API Key that can be obtained from "Admin" -> "API" screen.
- Authentication is done with HTTP Basic Authentication over HTTPS. Use API Key as the username and leave the password blank (or you can put any value as password if your HTTP client requires it).
- API key has the same access level as the user whom the key belongs to. For example, agent's API key allows access only to people assigned to that agent while broker's API key allows access to all people in the account.
- Role levels: Owner has access to everything. Admin (Broker) has most access but cannot access Webhooks. Agent only has access to contacts they are assigned to or are a collaborator on, with restricted access to things like action plans.

### 2. OAuth 2.0 (Authorization Code Flow)

Follow Up Boss APIs support the OAuth 2.0 protocol. Integration Partners can create an OAuth Client Application to securely obtain authorization consent and perform delegated actions on behalf of a FUB user.

- **Authorization URL:** `https://app.followupboss.com/oauth/authorize`
- **Token URL:** `https://app.followupboss.com/oauth/token`
- Parameters for authorization: `response_type=auth_code`, `client_id`, `redirect_uri`, `state`, `prompt=login`
- Token exchange uses HTTP Basic Authentication with `base64(client_id:client_secret)` and `application/x-www-form-urlencoded` body with `grant_type=authorization_code`.
- Access Tokens are short-lived tokens. Refresh tokens are used with `grant_type=refresh_token` to obtain new access tokens.
- To perform authenticated requests, your request must be Authenticated with HTTP Bearer/Token Authentication over HTTPS.

### System Identification (Required for Both Methods)

Every request to the API should include the registered 'X-System' and 'X-System-Key' headers. These headers are unique to your system and should be the same for every API request regardless of the Follow Up User's API Key. You must register your system with Follow Up Boss to obtain these headers.

**Base URL:** `https://api.followupboss.com/v1/`

## Features

### Contact (People) Management

Create, read, update, and delete contacts in the CRM. Follow Up Boss will automatically search for an existing contact and update it to avoid duplicates. Supports managing contact details including name, emails, phones, addresses, tags, stages, and custom fields. Contacts can be assigned to agents or lenders, and collaborators can be added. Supports checking for duplicates, claiming unclaimed leads, and managing file attachments on contacts.

### Lead & Event Ingestion

Send in a lead or an event related to a lead. You can notify Follow Up Boss when certain events occur on your website or system. For example: A user fills out a registration form on an IDX website, sends an inquiry about a property or submits a Contact Us form. Supported event types include Registration, Property Inquiry, Seller Inquiry, General Inquiry, and Visited Open House. New leads created by this method will only trigger action plans if they are of the specified types. Campaign/source tracking data can be included for marketing reports.

### People Relationships

Manage relationships between contacts (e.g., spouse, business partner). Create, read, update, and delete relationship records between people in the CRM.

### Deals & Pipelines

Manage real estate deals (transactions) with associated properties, prices, and commission fields. Create and manage pipelines with customizable stages to track deal progress. Supports file attachments on deals and deal-specific custom fields.

### Tasks & Appointments

Create and manage tasks assigned to users for contact follow-up. Create and manage appointments with configurable types and outcomes. Appointment types and outcomes can be customized.

### Communication Tracking

Log and retrieve calls, text messages, and emails associated with contacts. Supports creating call logs, sending text messages, and tracking email interactions.

### Notes & Collaboration

Add notes to contacts. Supports reactions (emoji responses) on notes and threaded replies for team collaboration on notes.

### Action Plans & Automations

Retrieve available action plans and enroll/manage people in action plans. Retrieve automations and manage people enrollment in automations. Action plans can be paused or resumed for specific contacts.

### Email Marketing

Manage email marketing campaigns and track email marketing events (opens, clicks, unsubscribes).

### Templates

Create and manage email templates and text message templates. Supports merge fields for personalization.

### Team & User Management

Retrieve users and their roles (Agent, Broker/Admin, Owner). Manage teams, groups (for round-robin lead distribution), and ponds (shared lead pools). View team inboxes.

### Smart Lists

Retrieve saved smart lists (filtered views of contacts).

### Custom Fields & Stages

Create and manage custom fields for contacts and deals. Create and manage pipeline stages and contact lifecycle stages.

### Inbox Apps

Build custom messaging channel integrations that appear in the Follow Up Boss inbox. Manage conversations, messages, participants, and notes within inbox app channels.

## Events

Follow Up Boss supports webhooks for real-time event notifications. Use webhooks to be notified about events that happen in a Follow Up Boss account. Only the owner has access to creating, updating, or deleting webhooks. Webhooks post JSON to a specific URL every time an event is triggered.

Webhooks are registered via the API by specifying an event type and a callback URL. Each webhook payload includes an `eventId`, timestamp, event type, affected resource IDs, and a URI to fetch the full resource. A `FUB-Signature` header is included for verification using HMAC-SHA256 with the X-System-Key. There is a limit of two webhooks per event per system.

### People Events

- `peopleCreated`, `peopleUpdated`, `peopleDeleted` — Triggered when contacts are created, updated (name, email, phone, address, stage, tags, assignment, custom fields, etc.), or deleted.
- `peopleTagsCreated` — Triggered when tags are added to a contact; includes tag names in the payload.
- `peopleStageUpdated` — Triggered when a contact's stage changes; includes the new stage name.
- `peopleRelationshipCreated`, `peopleRelationshipUpdated`, `peopleRelationshipDeleted` — Triggered when relationships between contacts change.

### Notes Events

- `notesCreated`, `notesUpdated`, `notesDeleted` — Triggered when notes are created, updated, or deleted.

### Reactions Events (Beta)

- `reactionCreated`, `reactionDeleted` — Triggered when reactions are added to or removed from notes.

### Threaded Replies Events (Beta)

- `threadedReplyCreated`, `threadedReplyUpdated`, `threadedReplyDeleted` — Triggered when threaded replies on notes are created, updated, or deleted.

### Email Events

- `emailsCreated`, `emailsUpdated`, `emailsDeleted` — Triggered on email activity changes.

### Task Events

- `tasksCreated`, `tasksUpdated`, `tasksDeleted` — Triggered when tasks are created, modified, or removed.

### Appointment Events

- `appointmentsCreated`, `appointmentsUpdated`, `appointmentsDeleted` — Triggered when appointments change. Only fires for appointments created in Follow Up Boss, not synced calendar appointments.

### Text Message Events

- `textMessagesCreated`, `textMessagesUpdated`, `textMessagesDeleted` — Triggered on text message activity.

### Call Events

- `callsCreated`, `callsUpdated`, `callsDeleted` — Triggered when call records change.

### Email Marketing Events

- `emEventsOpened`, `emEventsClicked`, `emEventsUnsubscribed` — Triggered when contacts open, click, or unsubscribe from marketing emails.

### Deal Events

- `dealsCreated`, `dealsUpdated`, `dealsDeleted` — Triggered when deals change. The updated event does not fire for file changes on deals.

### Stage Configuration Events

- `stageCreated`, `stageUpdated`, `stageDeleted` — Triggered when stage definitions are added, renamed, or removed in admin settings (not when a contact's stage changes).

### Pipeline Events

- `pipelineCreated`, `pipelineUpdated`, `pipelineDeleted` — Triggered when pipelines are created, modified, or deleted.
- `pipelineStageCreated`, `pipelineStageUpdated`, `pipelineStageDeleted` — Triggered when pipeline stages change.

### Custom Fields Configuration Events

- `customFieldsCreated`, `customFieldsUpdated`, `customFieldsDeleted` — Triggered when contact custom field definitions change (not field values).
- `dealCustomFieldsCreated`, `dealCustomFieldsUpdated`, `dealCustomFieldsDeleted` — Triggered when deal custom field definitions change.

### People Activity Events

- `eventsCreated` — Triggered when people perform actions on IDX websites (e.g., view a property, save a favorite).
