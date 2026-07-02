Now let me get details on webhook event triggers:Now I have enough information to write the specification.

# Slates Specification for Rollbar

## Overview

Rollbar is a real-time error tracking and monitoring platform for software applications. It provides APIs to report and manage errors/exceptions, track deployments, query occurrence data, and manage projects, teams, and users across an account.

## Authentication

Rollbar uses API access tokens for authentication. Authentication is done via access token included as the header `X-Rollbar-Access-Token`.

There are two levels of access tokens:

**Project Access Tokens**

Most operations are performed at the project level and require a project-specific access token. You can find and administer your project access tokens in Project -> Settings -> Project Access Tokens.

Project access tokens support the following scopes:

- `post_server_item` — Can post errors/exceptions and deploys from server-side code, and upload source maps.
- `post_client_item` — Can post errors/exceptions from client-side (browser, mobile) code only.
- `read` — Can perform all GET requests.
- `write` — Can perform PATCH and DELETE requests.

For newly created project tokens, `post_server_item` and `post_client_item` can no longer be combined with other scopes.

**Account Access Tokens**

Operations performed at the level of the account require an account-specific access token. These can be found and managed at {Account name} Settings -> Account Access Tokens.

Account access tokens support:

- `read` — Supports all GET operations at the account level.
- `write` — Supports all POST, PUT, PATCH, and DELETE operations at the account level.

**Example:**

```
curl --header 'X-Rollbar-Access-Token: YOUR_ACCESS_TOKEN' 'https://api.rollbar.com/api/1/item/12345'
```

The base API URL is `https://api.rollbar.com/api/1/`.

## Features

### Error & Message Tracking (Items)

Create, retrieve, list, and update items (grouped errors/messages) in a project. Items can be looked up by ID, UUID, or project counter. Items have statuses (active, resolved, muted, archived) and can be filtered by environment, level, and status.

### Occurrences

List and retrieve individual occurrences (instances of errors/messages) within a project or within a specific item. Occurrences can also be deleted.

### Deploy Tracking

If you notify Rollbar every time you deploy or release your app, you'll unlock several features that will help your debugging process. Deploys are reported via API with parameters including environment, revision (code version/git SHA), status (started, succeeded, failed, timed_out), and optional deployer information. Deploys can also be listed and retrieved. When deploys are reported to Rollbar, we'll attempt to identify a 'Suspect Deploy' for each error.

### Metrics & Reports

Retrieve metrics about items and occurrences, including top active items, occurrence counts over time, and resolution time metrics. Reports analogous to dashboard views (e.g., top 10 items in last 24 hours, daily new/reactivated items) are available.

### RQL (Rollbar Query Language)

Create and manage RQL jobs to run custom SQL-like queries against your occurrence data. Jobs can be created, checked for status, and results can be retrieved.

### Project Management

Create, list, retrieve, and delete projects within an account. A project represents a single deployable / release-able service or app and has its own settings for notifications, custom fingerprinting, user access, and more.

### Project Access Token Management

List, create, update (rate limits), and delete project access tokens programmatically.

### Team & User Management

Create and manage teams, list users within an account, and manage team memberships. Users can be assigned to or removed from teams, and email invitations can be sent to join teams. When creating teams via the API, you can set the `access_level` field (Standard, Light, or View) as a form of role-based access control, controlling permissions for assigned projects.

### Team-Project Associations

Assign teams to projects, remove teams from projects, and list a team's projects or a project's teams.

### Notification Rule Management

Configure notification rules programmatically for multiple channels: Webhook, Slack, PagerDuty, and Email. Rules can be created, listed, updated, replaced, and deleted for each channel.

### Symbol Map Uploads

Upload JavaScript source maps, iOS dSYM bundles, Android Proguard files, and Flutter symbol files to enable de-obfuscation of stack traces.

### Version Tracking

Retrieve details about code versions within a project and list items associated with a specific code version.

### Session Replay

Retrieve and delete session replay data associated with specific environments and sessions.

### Service Links

Create, list, update, and delete service links — templated URLs that provide quick navigation from Rollbar items to external tools and services.

### Environments

List all environments that have been seen for a project.

### People (PII Management)

Request deletion of a person's data from a project and check the status of deletion jobs, for data privacy compliance purposes.

## Events

You can set up webhooks to make Rollbar push data to any arbitrary external service. Notifications can be triggered only in specific conditions using filters, and the message format can be customized using variables. Notifications are a project-level configuration.

Webhook rules can also be managed programmatically via the API. All payloads are delivered over HTTP/HTTPS as POSTs. Payloads can be sent in either JSON or XML format. JSON is the default; to use XML, configure that by editing each rule.

Each webhook rule can optionally override the default destination URL on a per-rule basis.

### Item Events

- **New Item** (`new_item`) — An error/message is seen for the first time.
- **Every Occurrence** (`occurrence`) — Every time an error/message occurs.
- **10^nth Occurrence** (`exp_repeat_item`) — 10th, 100th, 1,000th, 10,000th, … occurrence. The payload includes the occurrence threshold that was crossed.
- **High Occurrence Rate** (`item_velocity`) — Triggered when a configurable number of occurrences are seen within a configurable time window. The payload includes `window_size` (seconds), `window_size_description` (human-readable), and `threshold` (number of events that triggered the notification).
- **Item Resolved** (`resolved_item`) — An error/message is marked Resolved.
- **Item Reopened** (`reopened_item`) — An error/message is marked Active by a user.
- **Item Reactivated** (`reactivated_item`) — An error/message occurs again after being previously resolved.

### Deploy Events

- **Deploy** (`deploy`) — Triggered when a deployment is reported to Rollbar. The payload includes deploy details such as environment, revision, and deployer information.
