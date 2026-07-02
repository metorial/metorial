# Slates Specification for WakaTime

## Overview

WakaTime is an automatic time tracking service for programmers. It uses IDE/editor plugins to collect coding activity (heartbeats) and provides dashboards, statistics, and leaderboards showing time spent coding broken down by project, language, editor, operating system, and more.

## Authentication

WakaTime supports two authentication methods:

### OAuth 2.0 (Recommended)

Most apps should use OAuth. To get started, create an app at `https://wakatime.com/apps` to obtain a client ID and client secret.

**Endpoints:**

- **Authorization:** `https://wakatime.com/oauth/authorize` — Redirect users here with required parameters: `client_id`, `response_type` (`code` or `token`), `redirect_uri`. Optional parameters: `scope`, `state`, `force_approve`.
- **Token Exchange:** `https://wakatime.com/oauth/token` — POST to exchange an authorization code for an access token. Required: `client_id`, `client_secret`, `redirect_uri`, `grant_type` (`authorization_code`), and the `code` received from the authorize step.
- **Token Revocation:** `https://wakatime.com/oauth/revoke` — POST with `client_id`, `client_secret`, and the `token` to revoke.

**Using the Access Token:** Pass the access token via the `Authorization: Bearer <access_token>` header.

**Refresh Tokens:** POST to `https://wakatime.com/oauth/token` with `grant_type` of `refresh_token`, along with `client_id`, `client_secret`, `redirect_uri`, and the `refresh_token`.

**Token Expiry:** Tokens obtained with `response_type=code` expire after 365 days. Tokens with `response_type=token` expire after 12 hours.

**Scopes** (space or comma separated):

- `read_summaries` — Access summaries and stats (categories, dependencies, editors, languages, machines, operating systems, projects). Sub-scopes available: `read_summaries.categories`, `read_summaries.dependencies`, `read_summaries.editors`, `read_summaries.languages`, `read_summaries.machines`, `read_summaries.operating_systems`, `read_summaries.projects`.
- `read_stats` — Access stats with similar sub-scopes: `read_stats.best_day`, `read_stats.categories`, `read_stats.dependencies`, `read_stats.editors`, `read_stats.languages`, `read_stats.machines`, `read_stats.operating_systems`, `read_stats.projects`.
- `read_goals` — Access user's goals.
- `read_orgs` / `write_orgs` — Read/modify organizations and dashboard members.
- `read_private_leaderboards` / `write_private_leaderboards` — Read/modify private leaderboards.
- `read_heartbeats` — Access coding activity, projects, files, durations, and heartbeats.
- `write_heartbeats` — Create, edit, and delete heartbeats and external durations.
- `email` — Access user's private email address.

### API Key

Using HTTP Basic Auth, pass your API Key base64 encoded in the Authorization header. Don't forget to prepend `Basic` to your api key after base64 encoding it.

For example, with an API key of `12345`: `Authorization: Basic MTIzNDU=`.

Alternatively, you can pass your api key as a query parameter in your request like `?api_key=XXXX`.

The API key can be found at `https://wakatime.com/api-key`. Do NOT use your API Key on a public website.

## Features

All API resources use the base URL `https://api.wakatime.com/api/v1/`.

### Coding Activity Summaries

Retrieve a user's coding activity for a given time range, segmented by day. Summaries break down time spent by project, language, editor, operating system, category, dependencies, and machine. Supports filtering by project, branch, and custom date ranges (e.g., "Today", "Last 7 Days", "Last 30 Days", "This Month").

### Coding Statistics

Access aggregated coding stats for configurable time ranges (`last_7_days`, `last_30_days`, `last_6_months`, `last_year`, `all_time`, or specific `YYYY` / `YYYY-MM`). Includes breakdowns by project, language, editor, OS, category, dependencies, and machines, plus best day and daily average. Stats may be computed asynchronously — check the `is_up_to_date` flag.

### Durations

Retrieve coding activity for a given day as an array of time durations. Durations are created by joining heartbeats within the user's keystroke timeout preference (default 15 minutes). Filterable by project, branches, and sliceable by project, entity, language, editor, OS, category, or machine. Also includes GenAI vs. human line change metrics.

### Heartbeats

Read and write raw coding activity events (heartbeats). Each heartbeat records an entity (file/app/domain), timestamp, project, branch, language, dependencies, line counts, and cursor position. Heartbeats can be created individually or in bulk. Deletion is also supported.

### External Durations

Create and manage activity durations from sources other than IDE plugins (e.g., calendar events or meetings). External durations have start/end times, an external ID for deduplication, and support categories like communicating, code reviewing, designing, researching, etc. Only OAuth apps can create external durations.

### Projects & Commits

List a user's projects and view commit history per project with time-spent-coding data per commit. Commits can be filtered by author and branch. Projects support connecting to remote repositories (GitHub, Bitbucket, GitLab).

### Goals

Retrieve a user's coding goals. Goals define a target number of seconds per day or week, can be scoped to specific languages, editors, or projects, and track success/failure over time. Goals support sharing with other users and can be configured to ignore specific weekdays or zero-activity days.

### Insights

Access deeper analytics about coding activity for a given time range. Available insight types include: weekday patterns, daily breakdowns, best day, daily average, and breakdowns by projects, languages, editors, categories, machines, and operating systems.

### Organizations & Dashboards

Manage organizations, their dashboards, and dashboard members. View aggregated or per-member coding activity summaries and durations for organization dashboards. Organizations also support custom rules for modifying heartbeat properties.

### Leaderboards

Access the public leaderboard of users ranked by coding activity. Filter by language, country, or hireable status. Users can also create and manage private leaderboards with invited members.

### Custom Rules

Define rules that transform heartbeat properties (e.g., change or delete language, project names) based on matching conditions. Rules apply to both past and future coding activity. Supports operations: equals, contains, starts with, ends with.

### User Profile & Machines

Retrieve user profile information including display name, email, timezone, last active plugin, social profiles, and plan details. List machines (computers) that have sent coding activity, including hostname, IP, and last seen time.

### Data Exports

Request full data exports of all coding activity as daily summaries or raw heartbeats in JSON format. Exports are generated asynchronously in the background and a download URL is provided upon completion.

### Embeddable Charts & JSON

Generate shareable chart URLs and JSON endpoints for safely embedding coding stats on public websites without exposing the API key.

### Aggregate Stats

View aggregate statistics across all WakaTime users for a given time range, including averages, medians, sums, and maximums for languages, editors, operating systems, and categories.

## Events

The provider does not support events. WakaTime does not offer webhooks or purpose-built polling/subscription mechanisms for real-time event delivery.
