Let me get more details on Plain's API authentication and webhook events.Now let me get details on the API permissions and the GraphQL API features.Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Plain

## Overview

Plain is an API-first customer support platform designed for B2B technical teams. Plain is built with the same GraphQL API it exposes to users, meaning there are no limitations in what can be done via the API vs the UI. It provides a unified inbox for managing customer conversations across email, Slack, Microsoft Teams, Discord, chat, and contact forms, with built-in AI capabilities, workflow automation, and customer context enrichment.

## Authentication

Plain uses **API Key** authentication tied to **Machine Users**.

### Setup

1. Create a Machine User by going to Settings → Machine Users and clicking "Add Machine User." A Machine User has two fields:
   - **Name**: Only visible to you, indicating the usage (e.g., "Autoresponder"). **Public name**: The name visible to customers if the Machine User interacts with them (e.g., "Mr Robot").

2. Click "Add API Key" and select the permissions you need. When making API calls, if you have insufficient permissions, the error will tell you which permissions you need.

3. Machine Users can have multiple API Keys to make it easy to rotate keys. Every API key has fine-grained permissions.

### Using the API Key

The API URL is `https://core-api.uk.plain.com/graphql/v1`. The required headers are `Content-Type: application/json` and `Authorization: Bearer YOUR_TOKEN` where the token is your API key.

### Permissions

API keys use fine-grained, resource-level permissions. Examples include:

- `customer:read` — Read customer data
- `customerEvent:create` — Create customer timeline events
- Permissions exist for threads, labels, messaging, and other resources

Each API key should be granted only the permissions needed for its use case.

## Features

### Customer Management

Manage customers, each with a name, short name, and email address. Email addresses are unique across all customers. Customers can have an `externalId` to correlate them with customers in your own systems. Customers can be created, updated, deleted, and queried by email or external ID.

### Company Management

Companies are automatically set based on the customer's email domain. The company of a customer can be changed manually and via the API. You can filter and organize support by company.

### Tenant Management

Tenants allow you to organize your customers in the same way they are organized in your product. For example, if your product's users are organized into teams, then every team would be one tenant within Plain. Tenants can only be created programmatically and are useful for advanced integrations. Customers can belong to multiple tenants. You can specify a tenant when creating a thread, which is useful for building support portals as it allows you to fetch threads specific to a team.

### Thread Management

Threads are the core unit of support in Plain — each representing a customer conversation. You can create threads, reply to them, assign them to users, change their status (Todo, Snoozed, Done), set priority levels, and filter them by various criteria such as tenant, customer, status, and labels. Support portals allow customers to view, create, and reply to support requests directly. Plain provides powerful APIs for this, and you build the UI — fully white-label with no separate login needed.

### Tier and SLA Management

Tiers allow you to organize companies and tenants into groups that match your product's pricing (e.g., "Enterprise", "Pro", "Free"). Within tiers you can define SLAs so you can stay on top of your queue and prioritize.

### Labels

Labels are a lightweight way of categorizing threads by topic (e.g., bugs, feature requests, demo requests). A thread can have one or more labels, each with a name and icon. You can filter threads by label in any queue.

### Timeline Events

Create custom events on a customer's timeline that appear in all their threads, or target a specific thread. Events support rich UI components (text, spacers, link buttons) and can include an external ID for idempotency and correlation with your own systems.

### Messaging

Send and receive messages across multiple channels including email, chat, Slack, and more. The API supports replying to threads, sending emails (with Cc/Bcc), and handling chat messages programmatically.

### Customer Cards

Display live customer data from your own backend systems directly within the Plain UI. Customer cards are fetched in real time, showing information such as subscription status, plan details, and usage metrics.

### Customer Groups

Organize customers into groups for segmentation and access control. Group memberships can be managed via the API.

## Events

Plain supports webhooks that can be configured in your workspace settings. The TypeScript SDK provides utilities to verify the webhook signature and parse the webhook body into a typed object. Webhooks are signed using an HMAC secret found in Plain's settings.

The following webhook event categories are available:

### Thread Events

- **Thread created** — Fired when a new thread is created.
- **Thread status transitioned** — Fired when a thread's status changes (e.g., from Todo to Done).
- **Thread assignment transitioned** — Fired when a thread is assigned or unassigned.
- **Thread labels changed** — Fired when labels on a thread are added or removed.
- **Thread priority changed** — Fired when a thread's priority level changes.
- **Thread SLA status transitioned** — Fired when an SLA status changes on a thread.
- **Thread Field created/updated/deleted** — Fired when custom fields on a thread are modified.

### Message Events

- **Email received** — Fired when an inbound email is received.
- **Email sent** — Fired when an email is sent from Plain.
- **Slack message received** — Fired when a message is received from Slack.
- **Slack message sent** — Fired when a message is sent to Slack.
- **Chat received** — Fired when a chat message from a customer is received.
- **Chat sent** — Fired when a chat message is sent to a customer.
- **Note created** — Fired when an internal note is created on a thread.

### Customer Events

- **Customer created** — Fired when a new customer is created.
- **Customer updated** — Fired when customer details are updated.
- **Customer deleted** — Fired when a customer is deleted.
- **Customer group membership changed** — Fired when a customer's group membership changes.
