Now let me get the full list of webhook events and scopes from the official documentation.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Zoho Desk

## Overview

Zoho Desk is a cloud-based customer service and help desk platform from Zoho Corporation. It provides multi-channel ticket management (email, chat, social media, phone), a knowledge base, agent management, workflow automation, and reporting for customer support operations. It is part of the broader Zoho suite of business applications.

## Authentication

Zoho Desk exclusively uses **OAuth 2.0** for API authentication.

### Setup

1. Register your application at the [Zoho API Console](https://api-console.zoho.com/) by providing a client name, homepage URL, and authorized redirect URI.
2. Upon registration, you receive a **Client ID** and **Client Secret**.

### Authorization Flow

Zoho Desk uses the **Authorization Code Grant** type. The flow is:

1. **Obtain authorization code**: Redirect the user to Zoho's authorization endpoint:
   ```
   https://accounts.zoho.com/oauth/v2/auth?scope=<SCOPES>&client_id=<CLIENT_ID>&response_type=code&access_type=offline&redirect_uri=<REDIRECT_URI>
   ```
2. **Exchange for tokens**: POST the authorization code to:
   ```
   https://accounts.zoho.com/oauth/v2/token
   ```
   with `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, and `redirect_uri`.
3. You receive an **access token** (valid for 1 hour) and a **refresh token** (valid until revoked).
4. Use the refresh token to obtain new access tokens via the same token endpoint with `grant_type=refresh_token`.

### Self-Client Option

For server-to-server integrations without user interaction, you can use Zoho's Self Client option in the API Console to generate a grant token directly by specifying scopes and a time duration.

### Required Headers

All API requests require two mandatory headers:

- `Authorization: Zoho-oauthtoken <ACCESS_TOKEN>`
- `orgId: <ORGANIZATION_ID>` — The ID of the Zoho Desk organization. You can retrieve available organizations via the `/api/v1/organizations` endpoint (the only endpoint that does not require `orgId`).

### Data Center Domains

Zoho operates region-specific data centers. The accounts and API base URLs differ by region:

- **US** (default): `accounts.zoho.com` / `desk.zoho.com`
- **EU**: `accounts.zoho.eu` / `desk.zoho.eu`
- **IN**: `accounts.zoho.in` / `desk.zoho.in`
- **AU**: `accounts.zoho.com.au` / `desk.zoho.com.au`
- **CN**: `accounts.zoho.com.cn` / `desk.zoho.com.cn`

### Scopes

Scopes follow the format `Desk.<module>.<operation>`, where operation can be `ALL`, `CREATE`, `READ`, `UPDATE`, or `DELETE`. Multiple scopes are comma-separated. Common scopes include:

- `Desk.tickets.ALL`, `Desk.tickets.READ`, `Desk.tickets.CREATE`, etc.
- `Desk.contacts.ALL`, `Desk.contacts.READ`, etc.
- `Desk.accounts.ALL`
- `Desk.tasks.ALL`
- `Desk.events.ALL` (for webhooks)
- `Desk.articles.ALL` (for knowledge base)
- `Desk.settings.ALL`
- `Desk.basic.ALL`
- `Desk.search.READ`

When using the Self Client flow, you should also include the `aaaserver.profile.read` scope.

## Features

### Ticket Management

Create, read, update, delete, and search support tickets. Tickets support custom fields, statuses, priorities, categories, assignments (to agents or teams), due dates, and department-based organization. You can also manage ticket threads (email conversations), comments, attachments, approvals, and tag tickets. Tickets can be merged, split, or moved between departments.

### Contact and Account Management

Manage customer contacts and their associated company accounts. Contacts and accounts support custom fields, and contacts can be linked to accounts. You can search, create, update, and delete contacts and accounts, and view associated tickets and activities.

### Knowledge Base

Manage help center articles, categories (root categories and sections), and translations. Articles support versioning, publishing workflows (draft/published), SEO metadata, permissions, and feedback. Article translations allow multi-language support.

### Agent Management

View and manage support agents, including their department associations, roles, profiles, and online/offline presence status. You can also manage teams and agent channel preferences.

### Activities (Tasks, Calls, Events)

Create and manage tasks, calls, and calendar events associated with tickets or standalone. Each activity type supports custom fields, priorities, statuses, due dates, and department assignments.

### Time Tracking

Log and manage time entries against tickets and tasks. Time entries support cost tracking (agent cost per hour, fixed cost, additional cost) and custom fields.

### Department Management

Create and manage departments to organize ticket routing and agent assignments. Departments can be configured for visibility in the customer portal.

### Search

Search across tickets, contacts, accounts, and other modules using keyword-based queries with filtering options.

### Help Center / Community

Manage help center configurations and community forums. This includes managing user groups, community topics, and help center customization.

### Automation & Workflows

Interact with automation rules, SLAs, assignment rules, and macros that power automated ticket routing, escalations, and notifications.

### Products

Manage products that can be associated with tickets and accounts for product-based support tracking.

### Custom Fields and Layouts

Modules like tickets, contacts, accounts, tasks, and calls support custom fields. Field layouts are dynamic and can be retrieved via the API to understand the schema for each module.

## Events

Zoho Desk supports **webhooks** that push event information to a callback URL in real time. Webhooks are managed programmatically via the API (create, read, update, delete) and use **JWT (RS256)** for authentication of payloads. A maximum of 20 webhooks can be configured per portal, with the number that can be simultaneously enabled depending on the Zoho Desk edition (5 for Professional, 10 for Enterprise; Free and Standard editions do not support webhooks).

### Ticket Events

- **Ticket_Add**: Triggered when a ticket is created.
- **Ticket_Update**: Triggered when a ticket is updated. Supports field-level filtering (track up to 5 specific fields) and `includePrevState` to receive the previous state.
- **Ticket_Delete**: Triggered when a ticket is deleted.
- **Ticket_Comment_Add / Ticket_Comment_Update**: Triggered when a comment is added to or updated on a ticket.
- **Ticket_Thread_Add**: Triggered when a thread (email reply) is added to a ticket. Supports a `direction` filter (`in` or `out`).
- **Ticket_Approval_Add / Ticket_Approval_Update**: Triggered when a ticket approval is created or updated.
- **Ticket_Attachment_Add / Ticket_Attachment_Update / Ticket_Attachment_Delete**: Triggered when a ticket attachment is added, updated, or deleted.

Ticket events (except delete, approval, and attachment events) support filtering by `departmentIds` to receive events only from specific departments. An `includeEventsFrom: ["AUTOMATION"]` option allows receiving events generated by time-based automation rules (Supervise Rules).

### Contact Events

- **Contact_Add / Contact_Update / Contact_Delete**: Triggered when a contact is created, updated, or deleted. Update events support `includePrevState`.

### Account Events

- **Account_Add / Account_Update / Account_Delete**: Triggered when a company account is created, updated, or deleted. Update events support `includePrevState`.

### Agent Events

- **Agent_Add / Agent_Update / Agent_Delete**: Triggered when an agent is added, updated, or deleted. Update events support `includePrevState`.
- **Agent_Presence_Update**: Triggered when an agent comes online or goes offline (session start/end only).
- **Agent_Channel_Preference_Update**: Triggered when an agent manually changes their channel status.

### Department Events

- **Department_Add / Department_Update**: Triggered when a department is created or updated. Update events support `includePrevState`.

### Task Events

- **Task_Add / Task_Update / Task_Delete**: Triggered when a task is created, updated, or deleted. Add and update events support `departmentIds` filtering. Update events support `includePrevState`.

### Call Events

- **Call_Add / Call_Update / Call_Delete**: Triggered when a call activity is created, updated, or deleted. Add and update events support `departmentIds` filtering. Update events support `includePrevState`.

### Event (Calendar) Events

- **Event_Add / Event_Update / Event_Delete**: Triggered when a calendar event is created, updated, or deleted. Add and update events support `departmentIds` filtering. Update events support `includePrevState`.

### Time Entry Events

- **TimeEntry_Add / TimeEntry_Update / TimeEntry_Delete**: Triggered when a time entry is created, updated, or deleted. Update events support `includePrevState`.

### Knowledge Base Events

- **Article_Add / Article_Update / Article_Delete**: Triggered when an article is created, updated, or permanently deleted. Update events support `includePrevState`.
- **Article_Translation_Add / Article_Translation_Update / Article_Translation_Delete**: Triggered for article translation lifecycle events. Update events support `includePrevState`.
- **Article_Feedback_Add**: Triggered when feedback is added to an article.
- **KBRootCategory_Add / KBRootCategory_Update / KBRootCategory_Delete**: Triggered for root category lifecycle events.
- **KBSection_Add / KBSection_Update / KBSection_Delete**: Triggered for KB section lifecycle events.

### Instant Messaging Events

- **IM_Message_Add**: Triggered when an incoming or outgoing instant message (e.g., WhatsApp) is received. Supports `departmentIds` filtering.
- **IM_Session_Status**: Triggered when the status of an IM conversation/session is updated (e.g., CREATED, OPEN, ON_PROGRESS, ON_HOLD, ENDED, BLOCKED). Supports `departmentIds` filtering.
- **IM_Message_Status**: Triggered when a message delivery status changes (SENT, DELIVERED, READ). Supports `departmentIds` filtering.

### General Webhook Options

- **ignoreSourceId**: A UUID that can be set on a webhook to prevent events triggered by your own API calls from firing the webhook, avoiding feedback loops in bidirectional integrations.
- **includePrevState**: Available on most update events; when enabled, the payload includes the previous state of the resource alongside the current state.
