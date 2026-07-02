# Slates Specification for Cats

## Overview

CATS (catsone.com) is a cloud-based applicant tracking system (ATS) and recruiting software. It provides tools for managing the full recruitment lifecycle, including candidate tracking, job order management, company/contact CRM, career portals, and customizable workflows.

## Authentication

CATS uses API key authentication. You can create an API key from the Administration settings page in CATS.

To authenticate, add an `Authorization` header to your requests that contains a value in the form `Token <Your API Key>`.

Example:

```
Authorization: Token abc123yourkey
```

The API base URL is `https://api.catsone.com/v3`. All requests must be made over HTTPS.

There is only one authentication method (API key). No OAuth2 or other mechanisms are supported. Each API key is associated with a specific CATS site/account.

## Features

### Candidate Management

Create, update, search, and delete candidate records. Candidates include details such as name, contact info, address, employer, skills, availability, pay expectations, and relocation preferences. Candidates can be marked as "hot" or active/inactive. Supports uploading resumes (which are indexed for boolean keyword search) and general attachments. Resume parsing is available to extract structured candidate data from uploaded files without creating a record. Candidates can have work history entries that optionally link to companies and contacts in the system. Duplicate detection is available when creating candidates via a `check_duplicate` flag.

### Job Order Management

Create, update, search, and delete job orders. Jobs include title, location, description, salary, duration, start date, company association, department, recruiter assignment, and publish status. Jobs can be associated with workflows and have configurable statuses with triggers. Job application forms with custom fields can be configured per job.

### Company and Contact CRM

Manage companies (client organizations) and contacts (individuals at those companies). Companies support departments, statuses with triggers, billing contacts, and key technologies. Contacts are linked to companies and support status management, reporting hierarchies, and activity logging. Both support custom fields, tags, attachments, lists, and thumbnails.

### Pipelines and Workflows

Pipelines represent the relationship between a candidate and a job order, tracking a candidate's progress through the hiring process. Each pipeline has a workflow with configurable statuses (e.g., Applied, Interviewed, Offered). Pipeline statuses can be changed with optional trigger firing, and full status history is available. Candidates can be rated (0–5) within a pipeline.

### Activities and Tasks

Log activities (calls, emails, meetings, text messages, etc.) against candidates, contacts, or jobs, optionally linked to a specific job order. Tasks can be created, assigned to users, prioritized (1–5), and marked as complete. Tasks can be associated with any data item type (candidate, contact, company, job).

### Career Portals

Manage career portals where jobs can be published and unpublished. Applications can be submitted through portals programmatically, including support for file uploads (base64 encoded), text fields, checkboxes, and radio buttons. Portal registration applications are also supported for candidate self-registration.

### Tags and Lists

Tags can be attached to candidates, contacts, companies, and jobs for categorization. Lists allow grouping records (candidates, contacts, companies, jobs) into named collections for organization and bulk tracking.

### Custom Fields

Custom fields of various types (text, textarea, number, date, dropdown, radio, checkboxes, checkbox, user) can be defined and attached to candidates, contacts, companies, and jobs. Custom field values can be read and updated per record and are also filterable in search queries.

### Search and Filtering

Full-text search and advanced filtered search are available for candidates, contacts, companies, jobs, activities, and pipelines. Filters support boolean logic (AND, OR, NOT) and operators such as `exactly`, `contains`, `between`, `greater_than`, `less_than`, `is_empty`, and `geo_distance` (for postal code proximity searches).

### Users and Site Info

List and retrieve user accounts associated with the CATS site. Retrieve site metadata (mode, subdomain) for the API token's associated account.

### Backups

Initiate and retrieve full data backups, with options to include or exclude attachments and emails.

## Events

CATS supports webhooks that can be subscribed to via the API or the CATS administrative UI. When creating a webhook, you specify one or more event types and a target URL. An optional `secret` can be provided for HMAC-SHA256 signature verification of incoming webhook payloads.

### Candidate Events

- `candidate.created` — A new candidate record is created.
- `candidate.updated` — A candidate record is updated.
- `candidate.deleted` — A candidate record is deleted.

### Job Events

- `job.created` — A new job order is created.
- `job.updated` — A job order is updated.
- `job.deleted` — A job order is deleted.
- `job.status_changed` — A job order's status changes. Includes previous and new status IDs.

### Contact Events

- `contact.created` — A new contact is created.
- `contact.updated` — A contact is updated.
- `contact.deleted` — A contact is deleted.
- `contact.status_changed` — A contact's status changes.

### Company Events

- `company.created` — A new company is created.
- `company.updated` — A company is updated.
- `company.deleted` — A company is deleted.
- `company.status_changed` — A company's status changes.

### Pipeline Events

- `pipeline.created` — A candidate is added to a job pipeline.
- `pipeline.deleted` — A candidate is removed from a job pipeline.
- `pipeline.status_changed` — A pipeline's workflow status changes. Includes previous and new status IDs.

### Activity Events

- `activity.created` — A new activity is logged.
- `activity.updated` — An activity is updated.
- `activity.deleted` — An activity is deleted.

### User Events

- `user.created` — A new user account is created.
- `user.updated` — A user account is updated.
- `user.deleted` — A user account is deleted.

Mass record updates in the CATS UI will fire individual webhooks for all affected records, which can result in large bursts of webhook calls. A webhook is automatically disabled after 50 consecutive failed delivery attempts (500 errors or timeouts) within a 30-minute window.

CATS also provides a purpose-built **Events polling mechanism** as an alternative to webhooks. Events are continuously recorded and can be polled by ID or timestamp, returning up to 25 events per request. This covers the same scope of actions as webhooks but does not require subscription setup.
