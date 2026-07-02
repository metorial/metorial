Now let me get details on the specific API resource categories available:Now I have comprehensive information to write the specification. Let me compile it:

# Slates Specification for Freshdesk

## Overview

Freshdesk is a cloud-based customer support helpdesk platform by Freshworks. It provides ticketing, contact management, knowledge base, community forums, and multi-channel support capabilities. The API (currently v2) is a REST API using JSON over HTTPS.

## Authentication

Freshdesk uses **HTTP Basic Authentication**. There are two methods:

### Method 1: API Key (Recommended)

You can use your personal API key to authenticate the request. If you use the API key, there is no need for a password. You can use any set of characters as a dummy password.

- Use the API key as the username and any placeholder (e.g., `X`) as the password.
- Example: `curl -v -u YOUR_API_KEY:X -H "Content-Type: application/json" https://yourdomain.freshdesk.com/api/v2/tickets`
- To find your API key: Click on your profile picture on the top right and select Profile Settings. On the right pane, click on the View API key option and complete the captcha verification.
- The API key must be Base64-encoded when passed as an `Authorization` header directly.

### Method 2: Username and Password

Freshdesk uses Basic Access Authorization. This means, for authentication, you can use the same username and password you use when logging into your helpdesk.

### Important Notes

- **Subdomain required**: All API requests are scoped to your Freshdesk subdomain: `https://{your_domain}.freshdesk.com/api/v2/...`. The subdomain is a required custom input for connecting.
- Your ability to access data depends on the permissions available for your Freshdesk profile. API access mirrors agent permissions.
- Freshdesk does **not** support OAuth 2.0 for its core helpdesk API.

## Features

### Ticket Management

Create, view, update, delete, filter, merge, and forward support tickets. Tickets support custom fields, tags, priorities, statuses, assignees, and associations (parent-child, tracker-related). You can also manage ticket watchers, summaries, and bulk operations (bulk update, bulk delete). Archived tickets can be viewed and deleted separately. Ticket forms can be managed to customize the ticket creation experience across portals.

- Tickets can be filtered using a query language that supports standard and custom fields, logical operators, and date ranges.
- Outbound email tickets can be created to initiate conversations with customers.
- Ticket fields and sections are fully configurable via the API (admin only).

### Conversations

Add replies, notes (public/private), and forward emails on tickets. Conversations support attachments and inline content. Notes can be used for internal collaboration between agents.

### Contact Management

Create, view, update, delete, merge, search, filter, import, and export contacts. Contacts support custom fields, multiple emails, company associations, tags, and social handles. Contacts can be converted to agents or field technicians. Contact fields are fully configurable.

### Company Management

Create, view, update, delete, search, filter, import, and export companies. Companies support domains (for automatic contact association), custom fields, health scores, account tiers, renewal dates, and industry classification. Company fields are configurable.

### Agent Management

Create, view, update, and delete agents. Manage agent availability, roles, groups, skills, and ticket scope. Supports full-time, occasional, field, and collaborator agent types. Agent availability can be viewed and updated per channel (email queue, messaging queue).

### Group Management

Create, view, update, and delete agent groups. Groups support automatic ticket assignment (round robin, skill-based, load-based, omniroute), escalation settings, and business calendar association. Agents can be added or removed from groups. Omnichannel groups sync across Freshdesk, Freshchat, and Freshcaller.

### Knowledge Base (Solutions)

Manage a three-level knowledge base hierarchy: categories, folders, and articles. Articles support drafts and published statuses, SEO metadata, tags, and multi-language translations. Folders have configurable visibility (all users, logged-in users, agents only, specific companies, specific segments). Articles can be searched by keyword.

### Community Forums (Discussions)

Manage community discussion forums with a hierarchy of categories, forums, topics, and comments. Forums support multiple types (how-to, ideas, problems, announcements) and configurable visibility. Topics can be monitored, locked, and stamped. Users can follow forums and topics.

### Satisfaction Surveys & Ratings

View configured surveys and create/view satisfaction ratings for tickets. Supports both classic (happy/neutral/unhappy) and new multi-level rating scales.

### Time Tracking

Create, view, update, and delete time entries on tickets. Supports billable/non-billable entries, running timers, and filtering by agent, company, and date range.

### Automation Rules

Create, view, update, and delete automation rules for ticket creation, ticket updates, and hourly triggers. Rules consist of performers, events, conditions, and actions including webhooks, email notifications, and field updates.

### SLA Policies

Create, view, update, and list SLA policies with per-priority response and resolution targets. SLAs can be scoped to specific companies, groups, sources, ticket types, and products. Multi-level resolution escalation is supported.

### Canned Responses

Create, update, and organize pre-defined reply templates in folders. Supports visibility controls (all agents, personal, specific groups), bulk creation, and attachments.

### Custom Objects

Create custom data entities with configurable schemas and field types (text, dropdown, number, date, lookup relationships, etc.). Records can be created, read, updated, deleted, filtered, and counted. Supports lookup relationships to native Freshdesk objects (tickets, contacts, companies).

### Email Mailbox Configuration

Create, view, update, and delete email mailboxes (Freshdesk-hosted or custom IMAP/SMTP). Configure mailbox settings like personalized replies, BCC emails, and requester creation preferences.

### Outbound WhatsApp Messages

Send proactive templated WhatsApp messages to customers using pre-approved templates via the WhatsApp Business Platform. Track message delivery status. Available on Pro and Enterprise plans.

### Account & Settings

View account information, export account data, and view helpdesk settings including language configuration.

### Collaboration Threads

Create and manage discussion, forward, and private threads on tickets. Threads support messages, participants (agents and external emails), and attachments.

### Products, Business Hours, Roles & Skills

View products and business hours configurations. Manage agent roles (view only) and skills with condition-based matching for ticket routing.

### Field Service Management

Create and manage service tasks (as child tickets), service groups, and field technicians for on-site support operations.

## Events

Freshdesk's automation lets you trigger webhook calls based on events happening in the helpdesk. Freshdesk does not offer a standalone webhook registration API. Instead, webhooks are configured through automation rules within the Freshdesk admin UI or via the Automations API.

### Ticket Creation Events

When tickets are created, you may want to automatically update certain properties or create records in an internal CRM, among other actions. You can use webhooks within automations that run on ticket creation to make those changes automatically.

- Triggers when a new ticket is created matching specified conditions.
- Conditions can filter on ticket properties like priority, source, type, group, product, and custom fields.
- The webhook action can make HTTP requests (GET, POST, PUT, PATCH, DELETE) to an external URL with configurable payload using ticket placeholders.

### Ticket Update Events

A webhook is a 'callback' to an application or web service that is automatically triggered in response to a specified event. In Freshdesk, a webhook lets you make an API call as part of an automation action.

- Triggers when a ticket is updated and matches specified events and conditions.
- Events can include changes to specific fields (e.g., status changed, agent assigned, satisfaction survey received, reply added).
- Supports conditions on the performer (agent, requester, or system) and ticket properties.
- Webhook payloads can include dynamic ticket data via placeholders.

### Time-Based (Hourly) Events

- Triggers periodically based on time conditions (e.g., ticket unresolved for X hours, pending since a certain time).
- Useful for escalation workflows and SLA-related notifications.
- Can trigger webhook calls to external systems based on time-elapsed conditions.

### Configuration Notes

- You can configure webhooks to make GET, POST, PUT, PATCH, and DELETE requests.
- Webhook payloads support JSON encoding with both simple and advanced (custom) content options.
- Authentication (API key-based) can be configured for outgoing webhook calls.
- Webhooks can also be configured programmatically via the Automations API (`/api/v2/automations/{type}/rules`).
