Now I have enough information. Let me compile the specification.

# Slates Specification for Teamwork

## Overview

Teamwork.com is a project management platform that provides tools for task management, time tracking, resource planning, collaboration, and client work management. It offers multiple product modules including Teamwork (projects), Teamwork Desk (helpdesk/support tickets), and Teamwork Spaces (content/documentation management). The API (currently on V3) allows programmatic access to manage projects, tasks, people, time entries, files, and more.

## Authentication

Teamwork supports two authentication methods:

### 1. Basic Authentication (API Key)

For personal use or testing, Basic Auth is sufficient. You will need your API key and your site URL to start using the API.

- Your API key can be found under your profile's **API & Mobile** tab in Teamwork.com.
- All API requests are scoped to `https://{yourSiteName}.teamwork.com`.
- Pass the API key as the username with any value (e.g., `x`) as the password, base64-encoded in the `Authorization` header: `Authorization: Basic base64({API_KEY}:x)`.
- EU-hosted customer accounts should use `{yourSiteName}.eu.teamwork.com` instead of `{yourSiteName}.teamwork.com`.

### 2. OAuth 2.0 (App Login Flow)

If you are developing an application or integration for others to use, you should utilize the App Login Flow which implements OAuth 2.0.

- Before using this flow, you must register your app in the Teamwork Developer Portal. Once created, open your app and go to the Credentials tab. You'll find all the necessary fields here: `client_id`, `client_secret`, and `redirect_uri`.
- **Authorization URL:** `https://www.teamwork.com/launchpad/login?redirect_uri=XXX&client_id=YYY` (generic, for any Teamwork site). Alternatively, use `https://{yourSiteName}.teamwork.com/launchpad/login?redirect_uri=XXX&client_id=YYY` for a specific account.
- A `code` query parameter is appended to the redirect URI containing a temporary authentication token (which expires in 15 minutes).
- **Token URL:** Make a HTTP POST request to `https://www.teamwork.com/launchpad/v1/token.json` with the `code`, `client_id`, `client_secret`, and `redirect_uri` as a JSON body.
- Store the `access_token` for all future requests. The token should be passed under the Authorization header as `Bearer XXX` where `XXX` is the token.
- The token exchange response also includes an `apiEndPoint` field indicating the correct regional API URL to use.
- Teamwork.com has multiple data center regions but you do not need to worry about making requests to multiple regions, as App Login Flow will handle everything.
- There are no granular OAuth scopes; the authenticated user will only have access and permission to the information that is accessible through their profile in Teamwork.com.

## Features

### Project Management

Create, update, archive, and delete projects. Projects support custom statuses, categories, tags, budgets, and can be organized by company. Projects can be copied and have their own settings for webhooks and permissions.

### Task & Task List Management

Manage task lists and tasks within projects. Tasks support assignees, due dates, start dates, priorities, tags, dependencies, subtasks, estimated time, and custom fields. Task lists can be created from templates. Tasks can be completed, reopened, and moved between lists.

### Time Tracking & Timers

Log time entries against projects, tasks, and allocations. Manage running timers — create, pause, resume, complete, and delete timers. Time entries support billable/non-billable flags, tags, and descriptions. Retrieve time totals aggregated by project or task.

### Milestones

Create and manage milestones within projects. Milestones can be assigned to responsible parties, have deadlines, and can be tagged. They support completion and reopening.

### People & Companies

Manage users and companies. Add people to projects, manage permissions, and organize contacts by company. Users can have different roles and access levels.

### Files & Documents

Upload, manage, and organize files within projects. Files support tagging and versioning. Track file downloads.

### Messages & Comments

Post messages (discussions) within projects and reply to them. Add comments to tasks, milestones, notebooks, and files. Messages support tagging.

### Notebooks

Create and manage project notebooks (wiki-style documents). Notebooks support tagging and versioning.

### Calendar Events

Create and manage calendar events visible across the site.

### Risks & Budgets

Track project risks and manage project budgets.

### Invoices & Expenses

Create, manage, and track invoices and expenses associated with projects. Invoices can be completed and reopened.

### Portfolio Boards

Manage portfolio boards with columns and cards to track projects at a high level across the organization. Available at site level.

### Forms

Create and publish forms that can be submitted to capture structured input.

### Custom Fields

Define and manage custom fields to extend the data model for tasks, projects, and other entities.

### Tags & Categories

Organize entities using tags and categories for filtering and grouping.

### Project Updates & Status

Post project status updates, manage project health, and provide progress visibility.

### Roles & Teams

Define roles and teams for organizing people and managing permissions.

## Events

Webhooks allow you to build or set up integrations with Teamwork products by subscribing to certain events. These events could be triggered by the actions of anyone in the organization. Webhooks support Version 2 payloads with more extensive data. Content type can be JSON, XML, or Form. A secret token can be provided, and Teamwork will use it to calculate a SHA-256 checksum sent in the `X-Projects-Signature` header.

Webhooks can be enabled and configured via site settings as well as via an individual project's settings. Webhooks are available on paid Teamwork.com subscription plans.

The following event categories are available:

- **Task Events**: Completed, created, deleted, moved, reminder, reopened, tagged, untagged, updated.
- **Task List Events**: Completed, created, created from template, deleted, reopened, updated.
- **Project Events**: Archived, completed, copied, created, deleted, reopened, tagged, untagged, updated.
- **Milestone Events**: Completed, created, deleted, reminder, reopened, tagged, untagged, updated.
- **Comment Events**: Created, deleted, updated.
- **Message Events**: Created, deleted, tagged, untagged, updated.
- **Message Reply Events**: Created, deleted, updated.
- **File Events**: Created, deleted, downloaded, tagged, untagged, updated.
- **Time Entry Events**: Created, deleted, tagged, untagged, updated.
- **Timer Events**: Created.
- **Calendar Events** (site-level only): Created, deleted, reminder, updated.
- **People/User Events** (site-level only): Created, deleted, updated.
- **Company Events** (site-level only): Created, deleted, updated.
- **Notebook Events**: Created, deleted, tagged, untagged, updated.
- **Link Events**: Created, deleted, tagged, untagged, updated.
- **Invoice Events**: Completed, created, deleted, reopened, updated.
- **Expense Events**: Created, deleted, updated.
- **Budget Events**: Created, deleted, updated.
- **Risk Events**: Created, deleted, updated.
- **Role Events**: Created, deleted, updated.
- **Team Events**: Created, deleted, updated.
- **Form Events**: Created, deleted, published, submitted.
- **Project Update Events**: Created, updated, deleted.
- **Project Rate Events**: Updated.
- **Status Events** (site-level only): Created, deleted, updated.
- **Portfolio Board Events** (site-level only): Created, deleted, updated.
- **Portfolio Card Events** (site-level only): Created, deleted, moved, reopened, updated.
- **Portfolio Column Events** (site-level only): Created, deleted, updated.
