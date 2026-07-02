The first result points to HelpDesk by Text (helpdesk.com). Let me get more details on their API and webhooks.Now let me also look at the LiveChat authorization documentation since HelpDesk shares it:Now I have comprehensive information about HelpDesk (by Text/LiveChat). Let me compile the specification.

# Slates Specification for Helpdesk

## Overview

HelpDesk (helpdesk.com) is a ticketing system by Text (formerly LiveChat, Inc.) that allows support teams to manage customer email communication through tickets. It provides ticket management, team organization, automation rules, email domain configuration, reporting, and integrates with the LiveChat ecosystem.

## Authentication

HelpDesk API shares an authentication and authorization system with LiveChat. Details can be found in the LiveChat Authorization Documentation.

All endpoints require an `Authorization` HTTP header. Two methods are supported:

### 1. Personal Access Tokens (PATs)

Recommended for testing and development.

- PATs can be created using the [Developers Console](https://developers.livechat.com/console/) in the **Tools / Personal Access Tokens** section.
- Use your HelpDesk credentials to log into the console.
- Use the `accounts--my:ro` scope to generate the token.
- After generating a token, use the Basic authentication scheme with the `account_id` displayed in Developers Console as the username and the generated token as the password.
- Note that with Basic Auth, you need to encode your credentials using base64.

### 2. OAuth 2.0 Authorization Code Grant (recommended for production)

- The OAuth 2 Authorization Code Grant flow is the recommended method for production deployment.
- The app is a LiveChat OAuth 2.1 Client with its own Client ID and Client Secret.
- Create an app in the [Developer Console](https://developers.livechat.com/console/) and configure the Authorization building block.
- Users are redirected to the LiveChat OAuth Server at `https://accounts.livechat.com/` with `response_type=code`, your `client_id`, `redirect_uri`, and a `state` parameter.
- The authorization code is then exchanged for an access token at `https://accounts.livechat.com/token`.
- To interact with the HelpDesk APIs, you need to provide an access token. The app needs to obtain the access token from the user in order to call the APIs on the user's behalf.
- Scopes are configured in Developer Console and determine which resources the app can access. Refer to method descriptions in the API docs for required scopes per endpoint.

**Base URL:** `https://api.helpdesk.com`

## Features

### Ticket Management

Create, read, update, and delete support tickets. Tickets have properties including status (open, pending, on hold, solved, closed), priority (low, medium, high, urgent), subject, requester info, CC recipients, tags, followers (agents), and custom fields. Tickets can be assigned to a team and/or agent. Tickets support merging (parent/child relationships) and unmerging. Tickets can be filtered by status, team, assignment, tags, requester, date ranges, custom fields, language, and full-text search. Tickets are organized into silos (folders): `tickets`, `archive`, `spam`, and `trash`, and can be moved between them.

- Tickets in `archive`, `spam`, and `trash` are read-only.
- Spam tickets are purged after 60 days; trash tickets after 30 days.

### Ticket Conversations (Transactions)

Add messages (public or private) to tickets, upload attachments via a transaction-based flow. Attachments must first be uploaded to a transaction, then referenced when creating or updating a ticket. Send rating requests to customers and view ticket ratings (good/neutral/bad).

### Ticket Import

Import historical tickets with full event history, including messages, status changes, and attachments. Events must be chronologically ordered and in the past. This is useful for migrating data from other systems.

- Transaction IDs for imports are valid for 24 hours.

### Agent Management

Manage agent accounts including creation, updating roles (owner, normal, viewer), team membership, notification preferences, avatars, signatures, and autoassignment settings. Agents can be configured for autoassignment to specific teams.

### Team Management

Create and manage teams that group agents. Every ticket is assigned to a specific team. Teams have configurable settings like notification preferences, reply addresses, and email templates. One team must always be designated as the default/fallback team.

### Tag Management

Create, update, and delete tags scoped to teams. Tags can be added to or removed from tickets for categorization.

### Custom Fields

Define custom fields on tickets with types: single line (120 char limit), multi line (1000 char limit), URL, and date (YYYY-MM-DD). Custom fields have configurable edit permissions (normal, owner/admin-only, read-only/API-only) and can be scoped to specific teams. Custom fields can be activated or deactivated.

- There is a per-license limit on active custom fields.
- Only unused custom fields can be deleted.

### Email Management

Configure custom email domains with DNS verification (CNAME, TXT records) to send emails from your own domain. Manage mailboxes (inboxes) that serve as entry points for email communication, with routing to specific teams and agents. Configure reply addresses per team. Manage trusted and blocked email/domain lists for spam control.

### Automation Rules

Create rules that automatically process tickets based on conditions (triggers) and actions. Triggers can be combined with AND/ANY logic. Available actions include: assigning tickets, changing status/priority, sending messages, adding/removing tags, adding/removing followers, marking as spam, sending rating requests, and sending follow-ups. Rules have configurable execution order.

### Macros

Define reusable sets of actions that can be applied to tickets in batch. Macros can be private (per-agent) or shared (visible to all agents). They support the same action types as rules. Limited to 20 shared macros per license and 20 private macros per agent.

### Canned Responses

Manage pre-written reply templates with keyboard shortcuts. Canned responses can be scoped to specific teams and support rich text with attachments.

### Views

Create saved ticket filters as named views for quick access. Views can be private or shared across all agents (admin-only for shared views).

### Reporting

Access a comprehensive set of reports including: new tickets, ticket sources, ticket ratings, agent ratings, ticket status, response time, and resolution time. All reports can be broken down by time period, by agent, or by team, and support 24-hour distribution views. Reports can be filtered by agent, tags, teams, priority, and spam status. Custom raw data reports can be generated and emailed as CSV.

- Also includes a failed outgoing emails report and ticket status duration reports.

### Audit Log

Query a log of all changes made in the system, filterable by action type (create, update, delete), entity type, author type, author ID, and time range. Tracked entities include agents, tickets, rules, tags, teams, templates, webhooks, and more.

## Events

HelpDesk supports webhooks that send HTTP POST requests with JSON payloads to a configured URL when specific ticket events occur.

### Ticket Lifecycle Events

- **Ticket Created** (`tickets.create`): Fired when a new ticket is created. Payload contains the full ticket object.
- **Ticket Updated** (`tickets.update`): Fired when any ticket property is modified. Payload contains the updated ticket object.

### Ticket Property Change Events

- **Status Changed** (`tickets.events.status`): Fired when a ticket's status changes (e.g., open → solved).
- **Priority Changed** (`tickets.events.priority`): Fired when a ticket's priority changes.
- **Assignment Changed** (`tickets.events.assignment`): Fired when a ticket's team or agent assignment changes.

### Ticket Activity Events

- **New Message** (`tickets.events.message`): Fired when a new message is added to a ticket. Payload includes both the ticket and the event (message) content.
- **Tags Changed** (`tickets.events.tags`): Fired when tags are added or removed from a ticket.
- **Followers Changed** (`tickets.events.followers`): Fired when followers (agents) are added or removed from a ticket.

Webhooks are managed via the API (create, list, update, delete). Each webhook is configured with a target URL and a single event type. Failed deliveries are retried for approximately 24 hours with increasing intervals.
