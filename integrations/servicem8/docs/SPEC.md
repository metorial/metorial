Now let me get the OAuth scopes and webhook event types:Let me get the full list of OAuth scopes:Now I have enough information to write the specification.

# Slates Specification for Servicem8

## Overview

ServiceM8 is a cloud-based field service management platform for small businesses. It provides job management, scheduling, client management, invoicing, quoting, and staff coordination across web and mobile apps. The API allows integration with third-party applications for automating workflows and syncing data.

## Authentication

ServiceM8 supports two authentication methods:

### 1. API Key (Private Applications)

For connecting to your own ServiceM8 account or a single customer's account. Generate an API key from your ServiceM8 account settings and include it in all requests via the `X-API-Key` header.

- **Header:** `X-API-Key: your_api_key_here`
- **Base URL:** `https://api.servicem8.com/api_1.0/`
- API key authentication does not support all platform features (e.g., Messaging API, Custom Fields API require OAuth 2.0).

### 2. OAuth 2.0 (Public Applications)

Required for public add-ons, multi-tenant integrations, and access to advanced APIs (Messaging, Custom Fields, Webhooks with challenge verification).

- **Authorization URL:** `https://go.servicem8.com/oauth/authorize`
- **Token URL:** `https://api.servicem8.com/oauth/token`
- **Credentials:** App ID (client_id) and App Secret (client_secret), obtained by registering as a Development Partner and creating a Public Application.
- **Grant type:** Authorization code flow. Access tokens expire (3600s) and can be refreshed using a refresh token.
- **Scopes** (resource-based, follow the pattern `read_<resource>` / `create_<resource>` / `manage_<resource>`):
  - `read_jobs`, `create_jobs`, `manage_jobs`
  - `read_customers`, `create_customers`, `manage_customers`
  - `read_staff`, `manage_staff`
  - `read_schedule`, `manage_schedule`
  - `read_locations`, `manage_locations`
  - `read_assets`, `manage_assets`
  - `read_job_materials`
  - `read_job_contacts`
  - And others per resource. Each API endpoint documents its required scope.
- **Incremental authorization** is supported — apps can request minimal scopes at sign-in and additional scopes later.
- **User impersonation:** Set the `x-impersonate-uuid` header to act as a specific staff member, which applies that user's security permissions.

## Features

### Job Management

Create, update, retrieve, and delete jobs. Jobs include details like address, description, status, and billing information. Jobs can also be created from templates. Job activities (scheduling entries), checklists, contacts, and payments are managed as related sub-resources.

- Jobs can be organized by categories, badges, and job queues.
- Job templates allow quick creation of recurring or standardized jobs.

### Client & Contact Management

Manage clients (referred to as "Company" in the API) and their associated contacts. Create, update, and delete client records with address, phone, and email data. Contacts can be associated at the company level or at individual job level.

- Note: The API refers to "Clients/Customers" as "Company" — naming differs from the UI.

### Scheduling & Staff Allocation

Manage job allocations (assigning staff to jobs), allocation windows (time slots), and job activities (scheduled work periods with start/end dates). Staff members can be created, updated, and managed with roles and security settings.

### Materials & Invoicing

Manage a materials/products catalog and associate materials with jobs (job materials). Materials can be grouped into bundles. Job payments can be recorded. Tax rates and suppliers are configurable.

### Assets

Track and manage customer assets with configurable asset types and custom asset type fields. Assets are linked to clients/locations.

### Forms & Checklists

Create and manage custom forms with configurable form fields, and collect form responses. Job checklists can be attached to jobs for task tracking.

### Notes & Attachments

Add notes and file attachments to jobs and other records. Supports attaching files to the job diary.

### Messaging (OAuth 2.0 only)

Send emails and SMS messages through the ServiceM8 platform on behalf of the account.

### Document Templates

Define document templates and produce templated documents (e.g., quotes, invoices) by merging data with templates.

### Custom Fields (OAuth 2.0 only)

Add custom fields to standard objects (e.g., jobs, clients). Custom fields are prefixed with `customfield_` and are readable/writable via the REST API.

### Inbox Management

List, read, archive, snooze, and manage inbox messages. Convert inbox messages to jobs or attach them to existing jobs.

### Search

Search across multiple object types or within a specific object type. Includes semantic search for jobs.

### Activity Feed

Post messages to the account's activity feed.

### Knowledge Base

Manage knowledge articles for internal reference.

### Account Provisioning

Provision new ServiceM8 accounts programmatically (for platform partners).

## Events

ServiceM8 supports webhooks through two subscription types:

### Object Webhooks

Subscribe to field-level changes on any object type (e.g., job, company, jobActivity, attachment, note, material). When any of the specified fields on that object change, a POST is sent to your callback URL containing the object type, UUID of the changed record, list of changed fields, timestamp, and a resource URL to fetch the full record.

- **Parameters:** `object` (object type to watch), `fields` (comma-separated list of fields to monitor), `callback_url`, optional `unique_id` for grouping.
- The webhook payload does not include the new field values — you must fetch the record via the provided `resource_url`.
- Public applications (OAuth 2.0) must complete a challenge verification handshake when subscribing; API key subscriptions do not require this.

### Event Webhooks

Subscribe to business-level events such as `job.created` and `job.completed`. When the specified event occurs, a webhook is sent to your callback URL with detailed event data.

- **Parameters:** `event` (event name), `callback_url`, optional `unique_id`.
- Event webhooks are a newer feature and provide higher-level, semantic event notifications compared to object webhooks.
