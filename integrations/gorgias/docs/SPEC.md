Now let me check the HTTP integration events (webhook triggers):Now let me check the exact HTTP integration trigger events available:Now I have enough information. Let me look at the HTTP integration triggers from the code example I found earlier to confirm the trigger event names:

From the earlier search result, the integration creation example showed triggers: `"ticket-created": true, "ticket-message-created": true, "ticket-updated": true`. And the UI documentation referenced triggers like "Tickets created" and "Tickets updated".

I now have comprehensive information to write the specification.

# Slates Specification for Gorgias

## Overview

Gorgias is a customer support helpdesk platform designed for e-commerce businesses. It provides multichannel ticket management (email, chat, phone, SMS, social media), customer data aggregation, automation rules, macros, and satisfaction surveys. The platform offers a REST API for programmatic access to all helpdesk resources.

## Authentication

Gorgias supports two authentication methods: **API Key (HTTP Basic Auth)** and **OAuth2**.

**Important:** Each Gorgias account has its own endpoint, which is defined by the subdomain. All API requests are made to `https://{subdomain}.gorgias.com/api/...`, where `{subdomain}` is the customer's Gorgias account subdomain.

### API Key (HTTP Basic Auth)

The API key authentication method can be used only for private apps. Each access token (or API key) is tied to a specific user and has the same permissions as the user that holds them. Requests made with an access token will act on behalf of a user and will have access to the resources their permissions allow.

To authenticate, use HTTP Basic Authentication with:

- **Username:** The email address of the Gorgias user
- **Password:** The API key generated in Settings → REST API

The `USERNAME:API_KEY` pair must be base64-encoded and sent as `Authorization: Basic <base64_encoded_string>`.

### OAuth2 (Authorization Code Flow)

To get full access to all Gorgias API features, be listed on the Gorgias App Store, and qualify for exclusive partner benefits, your app needs to use OAuth2 for authentication. Using OAuth2 is mandatory for public apps.

**Endpoints (per-account):**

- Authorization: `https://{subdomain}.gorgias.com/oauth/authorize`
- Token: `https://{subdomain}.gorgias.com/oauth/token`
- Revoke: `https://{subdomain}.gorgias.com/oauth/revoke`

**Flow:**

1. Register your app on the Gorgias Developer Portal to obtain a `client_id` and `client_secret`.
2. Redirect users to the authorization endpoint with `response_type=code`, `client_id`, `scope`, `redirect_uri`, and `state`.
3. After user approval, exchange the authorization `code` for an `access_token` and `refresh_token` via the token endpoint, authenticating with `client_id:client_secret`.
4. In OAuth2, the authentication is done using Bearer Access Tokens. Use `Authorization: Bearer <access_token>` for API calls.
5. If your app needs permanent access you should request the offline scope and get a refresh_token that can be used to get a new access_token when the old one expires.

**OAuth2 Scopes:**

Basic scopes: `openid`, `email`, `profile`, `offline` (required for refresh tokens).

Gorgias resource scopes (each with `:read` and `:write` variants):

- `account` — Account info and settings
- `users` — Helpdesk user accounts, roles, and teams
- `customers` — Customer data including integration data (e.g., Shopify)
- `tickets` — Tickets, messages, tags, assignees, and views
- `custom_fields` — Custom field definitions and values
- `events` — Tracked account change events
- `integrations` — HTTP and native integrations and widgets
- `jobs` — Bulk operations (e.g., mass close/export)
- `macros` — Macro templates and actions
- `rules` — Automation rules
- `satisfaction_survey` — Customer satisfaction surveys
- `statistics` (read-only) — Support metrics
- `tags` — Ticket tags
- `apps` — Third-party app management

The now-deprecated "write:all" can still be used for existing apps for the time being, but it is still advised to switch to the new scopes.

## Features

### Ticket Management

Create, retrieve, update, delete, and search support tickets. Tickets can be created across multiple channels (API, email, chat, phone, SMS). Since a ticket in Gorgias cannot be created without a ticket message, the required parameters when creating a ticket via API will depend on the message channel chosen. Tickets support tags, custom field values, status changes, priority, and assignee management.

### Ticket Messages

Add and manage messages within tickets, including customer replies, agent responses, and internal notes. Messages can be sent via different channels and support file attachments.

### Customer Management

Create, update, merge, and delete customer records. Customers have associated channels (email, phone, etc.) and can store data from external integrations. Custom field values can be set on customers for enriched profiles.

### Tags

Create, update, delete, and merge tags used for categorizing and organizing tickets.

### Macros

Manage reusable response templates (macros) with configurable actions. Macros can be created, updated, archived, and unarchived.

### Rules (Automation)

Create and manage automation rules that trigger actions based on ticket events and conditions. Rules support priority ordering to control execution order.

### Satisfaction Surveys

Create and manage customer satisfaction surveys (e.g., CSAT) that can be sent to customers after support interactions.

### Users and Teams

Manage helpdesk agent accounts including roles and permissions. Create and manage teams for organizing agents.

### Views

Create and manage custom ticket views with configurable filters and settings for organizing the ticket queue.

### Integrations and Widgets

Programmatically create and manage HTTP integrations that connect external services. Widgets are containers that can be used to display customized customer data coming from these integrations on the right-hand sidebar of the ticket or customer page.

### Statistics and Reporting

Retrieve support performance metrics and statistics. Download statistical reports for analysis.

### Search

Search across multiple resource types (tickets, customers, etc.) using a unified search interface.

### Custom Fields

Define and manage custom fields for tickets and customers to extend the data model.

### Voice Calls

Access voice call data, call recordings, and call events for phone-based support interactions. Recordings can be listed and deleted.

### Files

Upload and download file attachments used in ticket messages.

### Jobs

Manage long-running bulk operations such as mass ticket closures or data exports.

### Account Settings

Retrieve and update account-level configuration including business hours and other global settings.

## Events

Gorgias supports outbound webhooks through its **HTTP Integrations** system. Gorgias webhooks are automatic messages sent from your Gorgias helpdesk to another application when a specific event occurs. They allow your other tools to react to activity in Gorgias in real time, such as a new ticket being created.

HTTP Integrations can be created either via the UI (Settings → HTTP Integration) or programmatically via the API. Each integration specifies a target URL, HTTP method, headers, request body (with template variables like `{{ticket.customer.email}}`), and which trigger events activate it.

### Ticket Created

Fires when a new ticket is created in the helpdesk. The payload can include ticket data via template variables (ticket ID, status, customer info, etc.).

### Ticket Updated

Fires when an existing ticket is updated (e.g., status change, tag added, assignee change).

### Ticket Message Created

Fires when a new message is added to a ticket, including customer replies and agent responses.

**Configuration options:**

- Target URL endpoint to receive the webhook payload
- HTTP method (GET, POST, etc.)
- Custom headers (e.g., for authentication)
- Request body template using Gorgias variables (e.g., `{{ticket.id}}`, `{{ticket.status}}`, `{{ticket.customer.email}}`)
- Response content type (JSON, XML)

**Considerations:**

- If 100 requests fail in a row then the integration is disabled to prevent abuse.
