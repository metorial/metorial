# Slates Specification for HubSpot

## Overview

HubSpot is a customer platform offering CRM, marketing, sales, customer service, content management, and commerce tools. It provides a collection of RESTful APIs that give programmatic access to various features and data, including CRM, Marketing, Sales, and Service APIs. The platform consists of Marketing Hub, Sales Hub, Service Hub, Content Hub, Data Hub, Commerce Hub, and Smart CRM.

## Authentication

HubSpot supports two authentication methods. The two supported methods are OAuth 2.0 and Private App Access Tokens. HubSpot officially retired API Keys in late 2022.

### OAuth 2.0

OAuth is the standard for apps that need to connect to multiple HubSpot accounts. With OAuth, your app authenticates on behalf of the user, exchanging temporary authorization codes for secure access tokens. This keeps credentials private and gives users control over which data the integration can access.

**Flow:**

1. Create a HubSpot OAuth App to get your Client ID and Client Secret. Set permissions (scopes) to specify what your app can access. Build an authorization URL to direct users to approve app access. Exchange the authorization code for access and refresh tokens. Use the access token for API calls. Refresh tokens when needed.

**Endpoints:**

- Authorization URL: `https://app.hubspot.com/oauth/authorize`
- Token endpoint: `https://api.hubapi.com/oauth/v1/token`
- Refresh token endpoint: `https://api.hubapi.com/oauth/v1/token` (with `grant_type=refresh_token`)

**Credentials required:**

- Client ID and Client Secret, both generated once you create a public app.
- Redirect URI (must match exactly in your app settings)

**Scopes:** Scopes are granular and per-object. OAuth scopes define the permissions your application has within a user's HubSpot account, restricting access to specific API endpoints like contacts, deals, or custom objects. Scopes can be marked as required or optional. Optional scopes will be dropped if the selected HubSpot portal does not have access to those products. Common scopes include:

- `crm.objects.contacts.read` / `.write` — Contacts
- `crm.objects.companies.read` / `.write` — Companies
- `crm.objects.deals.read` / `.write` — Deals
- `crm.objects.custom.read` / `.write` — Custom objects (Enterprise)
- `crm.lists.read` / `.write` — Contact lists
- `content` — CMS, blog, email, landing pages
- `automation` — Workflows
- `forms` — Forms
- `files` — File Manager
- `tickets` — Tickets
- `e-commerce` — Products and line items
- `social` — Social media
- `oauth` — Required base scope for all public apps

The full list of scopes is extensive and tied to specific HubSpot account tiers (Free, Starter, Professional, Enterprise). Each API endpoint documents its required scopes.

**Token details:** Access tokens are passed as `Authorization: Bearer <token>` headers. Access tokens expire (typically ~30 minutes) and must be refreshed using the refresh token.

### Private App Access Tokens

Creating a private app in HubSpot instantly generates a unique access token. That token replaces older API key functionality and provides authenticated access with better visibility and revocation options.

In the HubSpot dashboard, navigate to Settings → Integrations → Private Apps, create a new private app, and define its scopes. Copy the generated access token and use it in API request headers as `Authorization: Bearer YOUR_ACCESS_TOKEN`.

Use OAuth for public or multi-account apps, and Private App Tokens for single-account or internal integrations.

**API Base URL:** `https://api.hubapi.com`

## Features

### CRM Object Management

Create, read, update, and delete core CRM objects including contacts, companies, deals, tickets, and line items. Custom objects allow storing any type of data (subscriptions, locations, shipments, events, etc.) and running reports on them. Custom objects require an Enterprise account.

- Supports property management (defining and configuring custom properties on any object)
- Objects can be searched and filtered using a powerful search API
- Associations API manages relationships between CRM objects (e.g., linking contacts to companies or deals)

### Engagements

Track interactions like calls, emails, meetings, notes, and tasks with your contacts. Engagements can be created, updated, and associated with CRM records.

### Marketing

Programmatically create, update, and manage marketing assets such as emails, landing pages, and workflows. Key capabilities include:

- Sending transactional and marketing emails
- Managing marketing campaigns and tracking performance
- Managing subscription preferences (opt-in/opt-out)
- Handling forms and form submissions
- Managing marketing events
- Sending custom behavioral events for analytics

### Automation

Build custom workflow actions and manage sequences. Workflows can be triggered by CRM events and can include custom coded actions. Sequences allow automated email outreach for sales.

- Requires Professional or Enterprise tier for most features

### CMS (Content Management)

Manage blog posts, site pages, landing pages, HubDB tables, domains, and templates. Includes knowledge base management for Service Hub users.

- File management for uploading and organizing assets
- Serverless functions (Enterprise Content Hub)

### Commerce

Handle e-commerce data including carts, orders, products, invoices, and payments. Manage commerce subscriptions, quotes, and line items. Supports order pipelines.

### Conversations

Handle messages, manage inboxes, and create custom channels. Includes visitor identification for authenticated chat widget users.

### Lists

Create and manage contact lists with static or dynamic membership. Lists can be used for segmentation across marketing and CRM tools.

### Pipelines

Configure deal, ticket, and order pipelines with custom stages. Pipelines define the lifecycle stages that objects move through.

### Account Settings & Users

Manage users, teams, permissions, currencies, and business units. Provision and deprovision users programmatically. Access account activity and audit logs.

### CRM Import/Export

Bulk import records into the CRM or export CRM data. Supports all CRM object types.

## Events

HubSpot supports webhooks for real-time event notifications. HubSpot supports webhooks two ways: the "Send a webhook" workflow action (Operations Hub Professional/Enterprise) and the Webhooks API for developer apps.

### Webhooks API (Developer/Public Apps)

You create one or more subscriptions that tell HubSpot which events your app wants to receive. Subscriptions apply to all customers who have installed your integration, meaning you only need to specify subscriptions once.

**Supported object types:** Contacts, Companies, Deals, Tickets, Line Items, Products, and (with expanded object support enabled) custom objects.

**Event types per object:**

- **Creation** — When an object is created
- **Deletion** — When an object is deleted
- **Property change** — When creating a subscription for property change events, you select the specific properties to listen for.
- **Merge** — When one object is merged into another in the CRM
- **Restore** — When a deleted object is restored
- **Association change** — When an association between objects is added or removed

**Configuration:**

- A target HTTPS URL must be provided where HubSpot will POST event payloads (JSON)
- Webhook settings can be cached for up to five minutes, so changes may take up to five minutes to take effect.
- Webhooks aren't available on free or starter tiers.

### Webhooks Journal API (V4)

Instead of receiving pushes, your app regularly polls the HubSpot event journal to fetch the latest changes on your schedule. You can page through journal files using offsets and retrieve historical changes for up to 3 days. No target URL is required. This is a purpose-built polling mechanism for high-scale or enterprise integrations that need reliable, ordered, and resumable event processing.

### Private App Webhooks

Private apps can also subscribe to webhook events directly via the HubSpot UI (Settings → Integrations → Private Apps → Webhooks tab), supporting the same object types and event types as the public app Webhooks API.
