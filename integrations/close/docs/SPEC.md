# Slates Specification for Close

## Overview

Close is a sales CRM platform designed for small and medium-sized businesses. It helps teams build relationships, track communications, and manage their sales pipeline. The API provides full access to CRM data including leads, contacts, opportunities, activities, and reporting.

## Authentication

Close supports two authentication methods:

### API Key (HTTP Basic Auth)

Send HTTP requests with an Authorization header containing the word `Basic` followed by a space and a base64-encoded string composed of the API key followed by a colon. The API key acts as the username and the password is always empty.

API keys are per-organization and can read and modify all of your CRM data.

To create an API key: go to Settings > Developer > API Keys and click + New API Key. Give it an informative name. Once created, copy and store the key securely — it will not be displayed again.

### OAuth 2.0 (Authorization Code Flow)

To start integrating with Close using OAuth 2.0, a developer must have a Close account and acquire a client ID and client secret. Those can be obtained by accessing the Settings page, navigating to Developer → OAuth Apps, and clicking Create App.

**Authorization endpoint:** `https://app.close.com/oauth2/authorize/`

- Parameters: `client_id`, `response_type=code`, `redirect_uri`

**Token endpoint:** `https://api.close.com/oauth2/token/`

- The Authorization Code can be exchanged for an Access Token by performing a POST request with form-encoded parameters. Parameters: `client_id`, `client_secret`, `grant_type=authorization_code`, `code`.
- The Access Token has a limited lifetime and expires in `expires_in` seconds (default 3600).

**Refresh tokens:** If your application has `offline_access` scope, a `refresh_token` will be present in the response and you can refresh the Access Token. Refresh via POST to `https://api.close.com/oauth2/token/` with `grant_type=refresh_token`. Note that the authorization server issues a new Refresh Token each time and revokes the old one.

**Revoke endpoint:** `https://api.close.com/oauth2/revoke/`

**Scopes:** The default scope is `all.full_access offline_access`, granting full access to the organization's data.

Send authenticated requests with an Authorization header containing the word `Bearer` followed by the Access Token.

## Features

### Lead Management

Leads represent a company or organization and can contain contacts, tasks, opportunities, and activities. These other objects must be children of a Lead. A Lead in Close is like both a "lead" and "account" in other CRM terminology. You can create, read, update, delete, and merge leads. Contacts, addresses, and custom fields can all be nested in the lead.

### Contact Management

Contacts belong to exactly one Lead. You can create, list, fetch, and update contacts with details like name, title, phone numbers, emails, and URLs.

### Opportunity Management

Opportunities represent potential deals and are associated with leads. They have configurable statuses (active, won, lost), values, confidence levels, and can be organized into pipelines.

### Activity Tracking

Activities include calls, emails, email threads, meetings, notes, SMS messages, WhatsApp messages, lead status changes, opportunity status changes, task completions, lead merges, and form submissions. Activities are always associated with a lead and can be created, read, and managed via the API.

### Task Management

Create, assign, and manage tasks associated with leads. Tasks can be marked as completed and tracked across the organization.

### Email Communication

Send and receive emails directly through the API. Emails are organized into threads. Email templates can be managed for reuse in outreach.

### Sequences (Email Automation)

Manage email sequences for automated outreach. You can create templates and enroll leads/contacts into multi-step email sequences.

### Calling and SMS

Log and manage call activities and SMS messages. Includes dialer functionality for managing phone-based outreach.

### Smart Views

Create and manage saved search filters (Smart Views) that define criteria for dynamically grouping leads.

### Advanced Filtering

Find leads that match specific conditions using the Advanced Filtering API. Supports complex query syntax for searching across leads, contacts, opportunities, and activities.

### Reporting

Returns data that allows graphing of arbitrary metrics, powering the "Explorer" in the UI. Supports overview and comparison report types, filterable by date range, query, or Smart View. Reports can be returned in JSON or CSV format.

### Custom Fields

Define custom fields on leads, contacts, opportunities, activities, and custom objects. Custom fields support multiple value types and can accept multiple values.

### Custom Activities and Custom Objects

Define custom activity types and custom object types with their own custom fields, enabling extensible data models beyond the built-in CRM objects.

### Organization and User Management

Manage organization settings, users, roles, groups, and memberships. Control access and team structure.

### Connected Accounts and Send As

Manage email accounts connected to Close and configure send-as identities for email communication.

### Scheduling Links

Manage scheduling links for booking meetings, including user-specific and shared scheduling links.

### Bulk Actions

Perform bulk operations on leads and other objects for large-scale data management.

### Exports

Generate and download data exports from the CRM.

### Field Enrichment

Access enrichment data for leads and contacts to enhance CRM records.

## Events

Close supports webhooks that allow a subscription URL to be configured to receive POSTed event data as it is added to the Event Log. Each subscription is configured to trigger when an event matches a set of object types and actions.

Each webhook event is defined by an `object_type` and an `action` from the event log. You can also use Webhook Filters to ensure an event only fires when certain conditions are met. Filters support operators like equals, not_equals, is_null, non_null, and contains on event fields.

The maximum number of webhook subscriptions per organization is 40.

Each subscription includes a `signature_key` used to sign webhooks for verification.

### Event Categories

The following object types can be subscribed to with actions such as `created`, `updated`, and `deleted`:

- **Lead** — Lead created, updated, deleted, or merged.
- **Contact** — Contact created, updated, or deleted.
- **Opportunity** — Opportunity created, updated, or deleted.
- **Activities** — Covers multiple activity types:
  - **Email** — Email created, updated, deleted, or sent.
  - **Email Thread** — Email thread created, updated, or deleted.
  - **Call** — Call created, updated, or deleted.
  - **SMS** — SMS created, updated, or deleted.
  - **Meeting** — Meeting created, updated, or deleted.
  - **Note** — Note created, updated, or deleted.
  - **WhatsApp Message** — WhatsApp message events.
  - **Lead Status Change** — Logged when a lead's status changes.
  - **Opportunity Status Change** — Logged when an opportunity's status changes.
  - **Task Completed** — Logged when a task is completed.
  - **Lead Merge** — Logged when leads are merged.
  - **Form Submission** — Logged when a form is submitted.
- **Task** — Task created, updated, or deleted.
- **Custom Activity Instances** — Events on custom activity records.
- **Custom Object Instances** — Events on custom object records.
- **Custom Fields** — Changes to lead, contact, opportunity, activity, and custom object custom field definitions.
- **Custom Activity Types / Custom Object Types** — Schema-level changes to custom types.
- **Shared Custom Fields** — Updates to shared custom field definitions.
- **Memberships** — User membership changes.
- **Roles** — Role changes.
- **Lead Statuses / Opportunity Statuses / Pipelines** — Configuration changes to statuses and pipelines.

Close also provides an **Event Log API** that allows you to access events up to 30 days back in history, useful for reprocessing missed webhook events or auditing changes.
