Now I have comprehensive information about Affinity's API. Let me compile the specification.

# Slates Specification for Affinity

## Overview

Affinity is a relationship intelligence CRM designed primarily for private capital firms (venture capital, private equity, etc.). It automatically captures and organizes relationship data from emails, meetings, and other interactions, and allows teams to manage deal pipelines, track people and organizations, and leverage relationship strength scoring.

## Authentication

Affinity supports API key-based authentication. Each user can generate one API key from the Settings panel in the Affinity web app (Settings → API). The API key can be used with two methods:

- **HTTP Basic Auth**: Pass the API key as the password with no username.
  ```
  curl "https://api.affinity.co/api_endpoint" -u :YOUR_API_KEY
  ```
- **HTTP Bearer Auth**: Pass the API key as a Bearer token in the Authorization header.
  ```
  curl "https://api.affinity.co/api_endpoint" -H "Authorization: Bearer YOUR_API_KEY"
  ```

**Important details:**

- The v1 API (base URL: `https://api.affinity.co/`) supports both Basic and Bearer auth.
- The v2 API (base URL: `https://api.affinity.co/v2/`) uses Bearer auth.
- One API key per user is supported. All changes made via the API are attributed to the key owner.
- API access is only available on certain Affinity plan tiers (Scale, Advanced, Enterprise). Essentials and legacy Professional plans have no or limited API access.
- There are no OAuth flows or scopes; permissions map to the in-product permissions of the user who generated the API key and are managed by the Affinity admin.

## Features

### People Management

Create, search, update, and delete person records in your team's shared contact book. Persons include anyone your team has communicated with via email, meetings, or manual entry. Each person has a computed primary email and automatic associations with organizations. You can search by name or email, and filter by interaction dates.

### Organization Management

Create, search, update, and delete organization records. Organizations are linked to people via email domains. Affinity maintains a proprietary global database of organizations to minimize data entry. Global organizations cannot be renamed or deleted. You can search by name or domain.

### Opportunity Management

Create, search, update, and delete opportunities (deals). Each opportunity belongs to a single list and can be associated with people and organizations. Opportunities are used to track deal pipeline progress and revenue.

### List Management

Create and retrieve lists, which function as customizable spreadsheets for organizing people, organizations, or opportunities. Each list can have custom fields (columns), permissions, and public/private visibility. You can add and remove entities from lists via list entries.

### Fields and Field Values

Define custom fields (columns) on lists or globally, supporting types such as text, number, date, location, person, organization, dropdowns, and ranked dropdowns. Read and write individual cell values for any entity on a list. Track historical changes to field values for auditing status transitions (e.g., deal pipeline stages).

### Interactions

Retrieve and create interaction records including emails, meetings, calls, and chat messages associated with people, organizations, or opportunities. Interactions can be filtered by type, date range, direction (sent/received), and participants.

### Relationship Strengths

Query computed relationship strength scores between internal team members and external contacts. Scores are based on email, call, and meeting activity and recalculated daily. Useful for identifying the strongest connection path to a given person or organization.

### Notes

Create, read, update, and delete notes associated with people, organizations, or opportunities. Notes support plain text and HTML formatting, threaded replies, and associations with interactions (e.g., meeting notes). Notes can be authored on behalf of other users.

### Entity Files

Upload, list, download, and retrieve files attached to people, organizations, or opportunities (e.g., pitch decks, contracts).

### Reminders

Create, read, update, and delete reminders. Supports one-time and recurring reminders, which can be tagged to a person, organization, or opportunity. Recurring reminders can auto-reset based on email, meeting, or any interaction activity.

### Enrichment Data

Access enriched data from Affinity's proprietary database and select third-party partners (e.g., Dealroom). Some partner data may not be accessible via the API due to licensing agreements. Smart fields (e.g., first/last email date, next meeting) are available on person and organization records.

## Events

Affinity supports webhooks via the v1 API. You can subscribe to events by registering a webhook URL, optionally specifying which event types to listen to. If no specific events are listed, all events are delivered. There is a maximum of three webhook subscriptions per Affinity instance. Webhooks fire immediately after the corresponding action and include retry logic with exponential backoff for up to 10 hours on delivery failure.

### List Events

Notifications when a list is created, updated, or deleted (`list.created`, `list.updated`, `list.deleted`).

### List Entry Events

Notifications when an entity is added to or removed from a list (`list_entry.created`, `list_entry.deleted`).

### Person Events

Notifications when a person record is created, updated, or deleted (`person.created`, `person.updated`, `person.deleted`).

### Organization Events

Notifications when an organization is created, updated, deleted, or merged (`organization.created`, `organization.updated`, `organization.deleted`, `organization.merged`).

### Opportunity Events

Notifications when an opportunity is created, updated, or deleted (`opportunity.created`, `opportunity.updated`, `opportunity.deleted`).

### Field Events

Notifications when a field (column definition) is created, updated, or deleted (`field.created`, `field.updated`, `field.deleted`). Does not fire for Crunchbase fields.

### Field Value Events

Notifications when a field value (cell data) is created, updated, or deleted (`field_value.created`, `field_value.updated`, `field_value.deleted`). Does not include enrichment field value updates.

### Note Events

Notifications when a note is created, updated, or deleted (`note.created`, `note.updated`, `note.deleted`).

### File Events

Notifications when a file is uploaded or deleted (`file.created`, `file.deleted`).

### Reminder Events

Notifications when a reminder is created, updated, or deleted (`reminder.created`, `reminder.updated`, `reminder.deleted`).
