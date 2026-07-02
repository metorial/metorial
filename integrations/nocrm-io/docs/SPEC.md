# Slates Specification for NoCRM.io

## Overview

NoCRM.io is a SaaS lead management software designed for sales teams to track and close deals. It focuses on lead lifecycle management with pipelines, prospecting lists, post-sales tasks, and team collaboration. The API (v2) is a REST API that allows programmatic access to manage leads, prospects, users, teams, and account configuration.

## Authentication

NoCRM.io supports two authentication methods, both requiring HTTPS:

### 1. API Key Authentication

- An admin generates API keys from **Admin Panel > Integrations > API > API Keys**.
- The API key is passed in the `X-API-KEY` request header.
- Requests made with an API key execute with admin-level privileges (as the first admin user).
- API keys are shown only once at creation; if lost, a new key must be generated.
- It is recommended to create one API key per integration.

### 2. User Token Authentication

- Obtain a user token by calling the **Login** endpoint (`GET /api/v2/auth/login`) using HTTP Basic Authentication (email and password).
- The returned token is passed in the `X-USER-TOKEN` request header.
- Requests are scoped to the logged-in user's permissions (non-admin users cannot access admin actions).
- The token is valid for 30 days or until logout (`GET /api/v2/auth/logout`).
- Admins can also impersonate a specific user via the **Log As** endpoint (`GET /api/v2/auth/log_as?user_id=ID`) using an API key, which returns a user token for that user.

### Account Subdomain

All API requests are made to `https://YOUR_SUBDOMAIN.nocrm.io/api/v2/...`. The subdomain is the unique identifier for each noCRM account.

### Partner Key (for registered integrations only)

VoIP and other registered partner integrations use an additional `X-API-PARTNER-KEY` header provided by noCRM after a partnership agreement.

## Features

### Lead Management

Create, retrieve, update, duplicate, assign, and delete leads. Leads have a title, description (with structured fields like name, email, phone), status (todo, standby, won, lost, cancelled), pipeline step, amount, probability, tags, reminders, and estimated closing dates. Leads can be assigned to users directly, randomly, via round-robin, or weighted round-robin. Leads can be starred, moved between pipeline steps, and associated with client folders. Duplicate detection is available based on title and key fields.

- Leads can be filtered by status, step, user, email, tags, date ranges, and custom field keys/values.
- Unassigned leads can be listed and assigned separately.

### Lead Comments and Attachments

Add, update, and delete comments on leads. Comments can include activity types (e.g., call, email, meeting) and file attachments. Attachments can be uploaded, listed, retrieved, and deleted. Business card images attached to leads can also be retrieved.

### Lead Action History

Retrieve the full action history of a lead, including events like creation, status changes, step changes, user assignments, comments added, emails sent, and amounts set. Filterable by date range, action type, and user.

### Email from Leads

Send emails to leads using pre-defined email templates or custom content. Requires a connected inbox for the sending user. Template variables are auto-populated from lead fields.

### Prospecting Lists

Create and manage prospecting lists (spreadsheets of prospects). Prospects can be added, updated, deleted, searched by email or field, and converted into leads. Prospecting lists can be assigned to users and commented on. Comments can also be added directly to individual prospects.

### Post-Sales Tasks

Create post-sales processes on leads from templates. List and update individual tasks within a post-sales process, including changing task status (todo, standby, done) and setting reminders.

### Client Folders

Create, retrieve, update, and delete client folders (company-level records). Leads can be associated with client folders.

### User Management

List, create, retrieve, disable users, and send activation emails. Users have roles (admin or non-admin) and can be filtered by status, role, or team membership.

### Team Management

Create, retrieve, update, and delete teams. Add or remove team members and designate managers. Teams feature may require a specific edition.

### Account Configuration

- **Pipelines**: List available pipelines (multiple pipelines may require a specific edition).
- **Steps**: List and retrieve pipeline steps.
- **Activities**: List configured activity types (call, email, meeting, etc.).
- **Categories and Tags**: List and create categories and predefined tags for lead classification.
- **Fields**: List and create default fields for leads and client folders, including custom field types.

### Simplified API

A simplified, GET-only API designed for no-code integrations (e.g., Zapier, Make). Supports common actions like changing lead status, assigning leads (including random and round-robin), moving leads between steps, adding tags, sending emails, logging activities, updating lead fields, appending to descriptions, duplicating leads, creating post-sales processes, finding prospects, and deleting leads.

## Events

NoCRM.io supports webhooks that send POST requests to a registered URL when specific events occur. Webhooks are created and managed via the API or the Admin Panel. Each webhook event includes a signature (SHA1 of the object ID and the API key) for verification. Webhook events are retained for up to 10 days and can be listed and retrieved via the API.

### Lead Events

- **Lead created** (`lead.creation`): Fires when a new lead is created.
- **Lead status changed** (`lead.status.changed`): Fires on any status change, with specific variants for each status: won, lost, cancelled, standby, and todo.
- **Lead step changed** (`lead.step.changed`): Fires when a lead moves to a different pipeline step. Can be configured for specific steps using `lead.step.changed.to.PIPE.NAME_OF_YOUR_STEP`.
- **Lead assigned** (`lead.assigned`): Fires when a lead is reassigned to a user.
- **Lead unassigned** (`lead.unassigned`): Fires when a lead is created without assignment.
- **Lead commented** (`lead.commented`): Fires when a comment is added to a lead.
- **Lead content changed** (`lead.content_has_changed`): Fires when a lead's description is modified.
- **Lead deleted** (`lead.deleted`): Fires when a lead is moved to trash.
- **Lead manual trigger** (`lead.manual.trigger`): A manually triggered webhook that can be added to the lead's actions menu.

### Prospect Events

- **Prospect created** (`prospect.created`): Fires when a prospect is created.
- **Prospect updated** (`prospect.updated`): Fires when one or more prospects are updated.

### Post-Sales Task Events

- **Task status changed** (`task.status.changed`): Fires on any task status change, with specific variants for done, standby, and todo.

### Account Configuration Events

- **Default field events**: Fires when a default field is created, updated, or deleted.
- **Step events**: Fires when a pipeline step is created, updated, or deleted.
- **Pipeline updated**: Fires when a pipeline is updated (e.g., name change).
- **Client folder created** (`client_folder.created`): Fires when a client folder is created.

Some advanced events are only available on certain account editions. Webhooks can be activated, disabled, listed, and created via the API. Notifications (email-based) are also supported as an alternative to URL-based webhooks using the same event system.
