Now let me get the specific webhook event types:The create webhook page didn't render the event types list. Let me search specifically for those.Now I have enough information. Let me compile the specification.

# Slates Specification for SafetyCulture

## Overview

SafetyCulture (formerly iAuditor) is a workplace operations platform for conducting inspections, capturing issues, managing corrective actions, tracking assets, and training teams. It provides a REST API at `https://api.safetyculture.io` for programmatic access to inspection data, issue management, user administration, and more. API access requires a Premium or Enterprise plan.

## Authentication

SafetyCulture uses **Bearer token authentication** via API tokens. There are two types of tokens:

- **User API tokens**: Tied to an individual user account and inherit that user's permissions and group/site memberships. Each user can create up to 10 active tokens. User API tokens expire after 30 days of inactivity.
- **Service user API tokens**: Not tied to a specific human user. Permissions are explicitly assigned to the service user, making them ideal for long-term, system-level integrations. Each organization can have up to 20 active service user tokens.

**How to generate a token:**

1. Log in to your SafetyCulture account.
2. Navigate to your profile settings.
3. Create a new API token by giving it a name and entering your password.

**How to use the token:**

Include the token in the `Authorization` header of every API request:

```
Authorization: Bearer <your_api_token>
```

The base URL for all API requests is `https://api.safetyculture.io`.

## Features

### Inspections

Create, start, update, complete, clone, archive, and delete inspections. You can answer inspection questions programmatically, pre-fill inspection responses, retrieve inspection answers, export inspections to PDF or Word, manage inspection access rules, and generate shareable web report links or deep links. Inspections can be filtered by modification date, template, and completion status.

### Templates

Retrieve, search, archive, restore, and delete inspection templates. Templates define the structure and questions used in inspections. You can search for modified templates and retrieve templates by ID or by associated inspection.

### Actions

Create and manage corrective actions with support for titles, descriptions, assignees, due dates, priorities, statuses, sites, labels, and custom fields. Actions can be linked to inspections, inspection items, or sensor alerts. Recurring action schedules are also supported. Action types and custom fields can be configured at the organization level.

### Issues

Create, list, update, and delete issues (incidents). Issues support categories, assignees, priorities, due dates, statuses, sites, and assets. You can track issue timelines, add comments, export issues to PDF, and generate web report links.

### Investigations

Create and manage investigations that can aggregate related inspections, issues, actions, and media. Investigations support categories, detail fields, statuses, and access control. PDF reports can be generated for investigations.

### Assets

Create, update, archive, and delete assets with custom asset types and fields. Assets can be looked up by code or by field values. Asset locations can be tracked and updated.

### Users and Groups

Create and manage users, including bulk user operations. Assign users to groups, manage permission sets, and define custom user fields and attributes. Groups can be created, listed, and have members added or removed.

### Schedules

Create, update, list, and delete scheduled inspection items. Schedules allow automating recurring inspections by assigning templates to users on a defined cadence.

### Training

Access training courses, lessons, collections, and learning paths. Manage course assignments and reset course progress. Retrieve detailed training analytics including course statistics, lesson attempts, lesson progress, slide statistics, and survey answers. Rapid Refresh quizzes are also accessible.

### Heads Up

Retrieve and list Heads Up communications (broadcast-style messages to teams). View completion counts, comments, and user engagement.

### Documents

Create, update, search, move, link, and archive files and folders within SafetyCulture's document storage. Manage file ownership.

### Credentials

Manage user credentials/certifications by creating credential types, adding credential versions for users, and tracking credential history and settings.

### Companies (Contractors)

Manage contractor companies, including company types, company documents, and company user memberships.

### OSHA Recordkeeping

Create and manage OSHA cases and establishments, including tracking employee counts and work hours for compliance reporting.

### Sensors

Provision, manage, and ingest readings from IoT sensors. Retrieve latest sensor readings.

### Directory (Sites and Folders)

Create and manage a hierarchical folder structure for organizing sites and templates. Associate users to folders and manage folder-level access.

### Data Feeds

Purpose-built incremental data export feeds for syncing SafetyCulture data to external data warehouses. Feeds are available for inspections, inspection items, actions, action assignees, issues, issue timelines, assets, users, groups, group users, sites, site members, templates, template permissions, schedules, schedule assignees, schedule occurrences, training course progress, investigations, and contractor companies.

### Response Sets

Create and manage global response sets (reusable sets of predefined answers) that can be shared across templates.

### Media

Download media files (images, etc.) attached to inspections and other resources via signed URLs.

### Lone Worker

Retrieve lone worker job data for monitoring worker safety.

## Events

SafetyCulture supports **webhooks** for receiving near real-time notifications when events occur within your organization.

- Webhooks are set up at the organization level. Any event that occurs in the top-level organization that registered the webhook can trigger it. Events are not scoped per user.
- When creating a webhook, you specify a URL and the event types you want to subscribe to. Payloads are sent as HTTP POST requests to that URL.
- A **signature secret** is provided for verifying the authenticity of incoming webhook payloads.
- Webhook events are not guaranteed to arrive in order, and duplicate deliveries may occur.
- Registering webhooks requires Administrator permission (for users) or the "Override permissions: Manage all data" permission (for service users).

### Inspection Events

Receive notifications when inspection-related events occur. This includes events for when an inspection has started, when an inspection is updated (response changes, access rule changes), when an inspection is completed, and when inspection metadata changes. You can subscribe to granular event types such as inspection started, updated, completed, or deleted.

### Action Events

Receive notifications when actions are created or updated.

### Issue Events

Receive notifications for issue-related events.

### Media Uploaded Events

The media uploaded event triggers once a full media file has been uploaded to SafetyCulture. This event only gets triggered by uploaded image media files.

### Training Events

Receive notifications for training-related events, such as when a course is created. Lesson content management events are also supported.
