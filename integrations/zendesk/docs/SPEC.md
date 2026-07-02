Now let me get the full list of webhook event types:Now I have enough information to write the specification.

# Slates Specification for Zendesk

## Overview

Zendesk is a customer service platform that provides ticketing, help center (knowledge base), live chat, messaging, voice, and sales CRM (Sell) tools. Its APIs allow programmatic management of support tickets, users, organizations, help center articles, chat conversations, and sales data across these products.

## Authentication

Zendesk supports two primary authentication methods for its APIs. All API requests are made against a subdomain-specific base URL: `https://{subdomain}.zendesk.com/api/v2/`.

### API Token (Basic Auth)

API tokens are managed in the Admin Center at Apps and integrations > APIs > Zendesk API. API tokens are auto-generated passwords that you can use with your email address to authenticate API requests.

To authenticate, use HTTP Basic Authentication with the following credentials:

- **Username:** `{email_address}/token`
- **Password:** `{api_token}`

Example: `Authorization: Basic {base64("{email_address}/token:{api_token}")}`

Unlike a password, an API token isn't tied to a specific user. You can use the token with the email address of any admin, agent, or other valid user. Permissions are limited by the user role associated with the provided email address.

**Required inputs:**

- **Subdomain:** The Zendesk account subdomain (e.g., `mycompany` in `mycompany.zendesk.com`)
- **Email address:** A verified user's email on the account
- **API token:** Generated from Admin Center

### OAuth 2.0

The Zendesk API supports OAuth authorization flows. An OAuth token gives access to a single Zendesk instance (the one with the OAuth client used to create the token).

Zendesk supports the **Authorization Code Grant** flow (including PKCE). The implicit grant flow is deprecated.

**Endpoints:**

- **Authorization URL:** `https://{subdomain}.zendesk.com/oauth/authorizations/new`
- **Token URL:** `https://{subdomain}.zendesk.com/oauth/tokens`

**Required inputs:**

- **Subdomain:** The Zendesk account subdomain
- **Client ID:** The unique identifier assigned when registering the application
- **Client Secret:** The secret assigned when registering the application
- **Redirect URI:** Must be HTTPS (except for localhost)

**Scopes:**

Scopes are a space-separated list that control access to the Zendesk resources. You can request read, write, or impersonate access to all resources or to specific resources.

Scope format: `{resource}:{access}` (e.g., `tickets:read`, `organizations:write`). The "read" scope gives access to GET endpoints. It includes permission to sideload related resources. The "write" scope gives access to POST, PUT, and DELETE endpoints for creating, updating, and deleting resources. If no resource is specified, access applies to all resources. The "impersonate" scope allows a Zendesk admin to make requests on behalf of end users.

Examples: `read`, `write`, `tickets:read`, `organizations:write`, `read write`, `impersonate`.

Zendesk does not set the access token expires_in value by default. However, if you decide to configure them through the API, those settings are enforced. Refresh tokens are supported.

### Zendesk Chat OAuth (Separate Flow)

You must use OAuth2 to authenticate all your API requests to Zendesk Chat. OAuth provides a secure way for your application to access your account data without requiring sensitive information.

Chat uses separate OAuth endpoints:

- **Authorization URL:** `https://{subdomain}.zendesk.com/oauth2/chat/authorizations/new`
- **Token URL:** `https://{subdomain}.zendesk.com/oauth2/chat/token`

Chat OAuth also supports the **Client Credentials** grant type in addition to the Authorization Code flow.

### Zendesk Sell (Separate Flow)

All requests to the Sell API must be authenticated and must include a valid access token. Sell uses its own OAuth endpoints at `https://api.getbase.com/oauth2/`. Access tokens obtained via the token endpoint in the OAuth 2.0 Multi-User Application flow have a finite lifetime set to one hour.

## Features

### Ticket Management

Create, read, update, and delete support tickets. Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support. Tickets can originate from a number of channels, including email, Help Center, chat, phone call, X (formerly Twitter), Facebook, or the API. Supports assigning tickets to agents or groups, setting priority/status, adding tags, managing collaborators (CCs/followers), and adding public or private comments with attachments. Custom ticket forms and custom ticket statuses are supported. Bulk import of tickets is available for data migration.

### User and Organization Management

Create, update, and delete users (end users, agents, admins) and organizations. A user identity is something that identifies an individual. A primary email address is typically used as the user identity. An X (formerly Twitter) handle, a secondary email, or a phone number can be used too. Users can be associated with organizations and groups. Supports bulk user creation and import.

### Help Center (Guide)

Manage knowledge base content including articles, sections, and categories. Articles support translations for multiple locales. Manage user segments and permission groups that control content visibility. Supports article attachments and article labeling.

### Community (Gather)

Manage community forums including posts, comments, and topics. Supports moderation features like voting and flagging content.

### Search

You can leverage the search API to make complex tasks simpler. Sometimes a task that may seem complex or require multiple endpoints can be accomplished easily with the search API. Supports full-text search across tickets, users, organizations, and other objects with filtering by fields, tags, dates, and more.

### Live Chat and Messaging

Manage real-time chat conversations, chat agents, departments, and visitor information. Messaging APIs allow managing conversations across messaging channels. The Sunshine Conversations API provides a unified interface for messaging across multiple channels.

### Sales CRM (Sell)

Manage sales pipeline data including leads, contacts, deals, and related notes and tasks. Supports sales activity tracking and custom fields.

### Business Rules

Manage triggers (event-based rules) and automations (time-based rules) that automate ticket workflows. Triggers execute when ticket conditions are met; automations run at scheduled intervals. Macros allow agents to apply predefined actions to tickets.

### Custom Objects

Define and manage custom data objects that extend Zendesk beyond standard resources. Custom objects support custom fields and relationships to other Zendesk resources.

### Views and SLAs

Manage ticket views (saved ticket filters for agents) and SLA policies that define response and resolution time targets.

### Omnichannel Routing

Configure how tickets, chats, and calls are routed to agents. Monitor agent availability and capacity across channels.

### Webhooks Management

Create and manage outbound webhooks that send HTTP requests to external services in response to Zendesk events or triggers/automations.

### JIRA Integration

Native integration API for connecting Zendesk tickets with JIRA issues.

## Events

Webhooks let you build or set up integrations that subscribe to certain activity in Zendesk Support, Guide, Gather, and Messaging. When this activity occurs, Zendesk sends a HTTP request to the webhook's configured URL. For example, you can configure a webhook to send requests when a user is deleted or a new ticket is created.

Zendesk supports two webhook connection methods: subscribing directly to Zendesk event types, or connecting to triggers/automations for ticket-based activity. A webhook that's subscribed to a Zendesk event can't connect to a trigger or automation. Similarly, a webhook that's connected to a trigger or automation can't subscribe to Zendesk events. You can't change an existing webhook's connection method.

### Ticket Events

Events for ticket lifecycle activity including: ticket created, comment added, comment redacted, tags changed, status changed, assignee changed, group changed, followers changed, CCs changed, priority changed, subject changed, and custom field changed.

- Webhooks can subscribe directly to these event types or be triggered via triggers/automations.

### User Events

Events for user lifecycle activity including: user created, deleted, merged, active status changed, alias changed, custom field changed, custom role changed, default group changed, details changed, external ID changed, group membership changes, identity changed, last login changed, name changed, notes changed, only private comments changed, organization membership changes, phone changed, photos changed, role changed, signature changed, suspended status changed, tags changed, and time zone changed.

### Organization Events

Events for organization lifecycle activity including: organization created, deleted, external ID changed, custom field changed, tags changed, and name changed.

### Article Events (Help Center)

Events for help center article activity including: article published, unpublished, and subscription created.

### Community Post Events

Events for community activity including: post created, changed, and community post vote events (vote created, changed, removed).

### Agent Availability Events

Zendesk customers and partners can receive real-time data as soon as an agent's status, work item assignment, or capacity changes. The ability to subscribe to agent availability events enables you to build real-time, event-driven presence, activity monitoring, reporting, and routing applications through webhooks. Includes: agent channel status changed, unified status changed, work item added/updated/removed, and max capacity changed.

### Omnichannel Routing Configuration Events

Events for changes to omnichannel routing configuration, such as routing being activated or deactivated.

### Live Messaging Metrics Events

Events related to real-time messaging metrics and performance data.

### Messaging Events

Events for messaging conversation activity including: chat message added, conversation completed.

### Trigger/Automation-Connected Webhooks

If a webhook is connected to a trigger or automation, you can customize the HTTP method, format, and content of the webhook's requests. You select the HTTP method and request body format when you create the webhook. Webhooks connected to a trigger or automation support multiple request body formats. This provides highly flexible, condition-based event delivery for ticket activity using Zendesk's existing business rules engine.
