# Slates Specification for PostHog

## Overview

PostHog is an open-source product analytics platform that provides product analytics, web analytics, session replay, feature flags, A/B testing (experiments), surveys, error tracking, LLM analytics, data pipelines, and a data warehouse. It provides product analytics, web analytics, session replay, error tracking, feature flags, experiments, surveys, LLM analytics, data warehouse, CDP, and an AI product assistant. It can be self-hosted or used as a cloud service (US and EU regions).

## Authentication

PostHog supports two primary authentication mechanisms:

### 1. Project API Key (Public Endpoints)

Public POST-only endpoints such as `/i/v0/e` and `/flags` are used for capturing events, batching events, updating person or group information, and evaluating feature flags. These don't require authentication, but use your project token to handle the request.

- The project API key (token) is found in your project's General Settings.
- The project token is a write-only key, which works perfectly for the POST-only endpoints.
- Used as the `api_key` or `token` field in the request body.

### 2. Personal API Key (Private Endpoints)

Private GET, POST, PATCH, DELETE endpoints are used for querying, creating, updating, or deleting nearly all data in PostHog. They give the same access as if you were logged into your PostHog instance, but require authentication with your personal API key.

- Personal API keys can enable full access to your account. You can create multiple, give them different scopes, and each can be invalidated individually.
- Created under Account Settings → Personal API Keys.
- Choose the scopes for your key. We recommended selecting only the scopes required for the API endpoints you really need.
- Scopes follow a `resource:action` pattern (e.g., `experiment:read`, `experiment:write`, `session_recording:read`, `project:read`).
- The key is used either as a bearer token, in the request body, or in the query string to authenticate your request.
- Keys are prefixed with `phx_`.
- You can create up to 10 personal API keys.

### 3. OAuth 2.0

PostHog supports OAuth 2.0 with authorization code flow for third-party integrations.

- Must authenticate with both client_id and client_secret when exchanging authorization code for tokens. OAuth supports all the same scopes as Personal API Keys.
- Each scope has a read and/or write action (e.g., `experiment:read`, `experiment:write`).
- Standard OpenID Connect scopes are also supported: `openid`, `profile`.
- Token endpoint: `https://app.posthog.com/oauth/token` (or your instance URL).
- PostHog rotates refresh tokens: when a refresh token is exchanged, the previous access and refresh tokens are invalidated and new tokens are returned.
- Access tokens are prefixed with `pha_`, refresh tokens with `phr_`.
- You can use the `required_access_level=project` or `required_access_level=organization` query parameter in the authorization URL to force the user to scope access.

### API Base URLs

On US Cloud, these are `https://us.i.posthog.com` for public endpoints and `https://us.posthog.com` for private ones. On EU Cloud, these are `https://eu.i.posthog.com` for public endpoints and `https://eu.posthog.com` for private ones. For self-hosted instances, use your self-hosted domain.

## Features

### Event Capture & Ingestion

Capture user events (pageviews, custom events, screen views, etc.) and send them to PostHog. The `/i/v0/e` and `/batch` endpoints are the main way to send events to PostHog. Beyond user behavior, they are also used to identify users, update person or group properties, migrate from other platforms, and more.

- Supports single event capture and batch capture of multiple events.
- Special event types include `$identify` (for setting person properties), `$create_alias` (for merging users), `$pageview`, `$screen`, and `$exception`.
- Each event requires `api_key` (project token), `distinct_id`, and `event` name.

### Person & Group Management

Read, filter, and delete person profiles. The persons endpoint is meant for reading and deleting persons. To create or update persons, use the capture API with the `$set` and `$unset` properties.

- Groups aggregate events based on entities, such as organizations or companies. Every individual group can have properties associated with it, just like persons.
- Persons can be filtered by properties, and their cohort memberships, feature flags, and session recordings can be retrieved.

### Feature Flags

Create, read, update and delete feature flags. Evaluate feature flags for specific users via the `/flags` endpoint.

- The flags endpoint is used to evaluate feature flags for a given `distinct_id`. This means it is the main endpoint not only for feature flags, but also experimentation, early access features, and survey display conditions.
- Supports boolean flags, multivariate flags (A/B test variants), and remote config flags.
- Flag evaluation supports providing person properties, group properties, and evaluation context tags inline.
- Management API (create/update/delete) requires a personal API key; evaluation uses the project token.

### Experiments (A/B Tests)

Create and manage A/B test experiments. Experiments run on top of feature flags. Once you've implemented the flag in your code, you run an experiment by creating a new experiment in the PostHog dashboard.

- Configurable parameters include name, description, start/end dates, feature flag key, metrics, holdout groups, and statistical method.

### Surveys

Create, update, list, and retrieve surveys programmatically. Surveys can be of various types (e.g., popover) and can be linked to feature flags for targeting conditions.

- You can capture survey-related events. These include survey sent, survey shown, and survey dismissed, each of which requires `$survey_id` as a property.

### Insights & Dashboards

Retrieve and manage analytics insights (trends, funnels, retention, user paths, stickiness, lifecycle). API routes exist for all types of data in your project, from actions to cohorts to trends.

- Insights can be listed, retrieved by ID, and filtered.
- Dashboards can be created, listed, updated, shared, and deleted.

### Query API (HogQL)

Run ad-hoc queries against your PostHog data using HogQL (PostHog's SQL-like query language). If you want to ad-hoc list or aggregate events, use the Query endpoint.

### Cohorts

Cohorts represent a specific set of users – e.g., a list of users whose email contains a certain string. Create, list, and manage both static and dynamic cohorts via the API.

- Static cohorts are lists of users that don't change over time (unless you update them manually).
- Dynamic cohorts are updated once every 24 hours.

### Session Recordings

List and retrieve metadata about session recordings. The endpoint does not provide the raw JSON of the replays. To get the raw JSON, you need to click Export as JSON in the replay options menu in-app.

- Recordings can be filtered and their sharing configurations managed.

### Actions & Data Management

Manage actions (combinations of events), event definitions, and property definitions. Actions can be created, updated, and soft-deleted.

- The `/api/event_definition/` and `/api/property_definition` endpoints provide the possible event names and properties you can use throughout the rest of the API.

### Project & Organization Management

List, create, update, and manage projects within an organization. Retrieve current user and organization info.

### Data Pipelines (CDP)

Configure data pipeline destinations and sources. Send event data to external services or ingest data from external systems into PostHog via incoming webhooks.

### Annotations

Create and manage annotations on charts/dashboards to mark significant events or deployments.

## Events

PostHog supports outbound webhook destinations as part of its data pipeline (CDP) feature. These allow you to send data to external HTTP endpoints in real-time as events are ingested.

### Webhook Destinations (Outbound)

With webhook destinations, you can send event data from PostHog to any HTTP endpoint, whether it's to your own backend, an internal system, or a third-party platform.

- Configured within PostHog's Data Pipelines section, not via a traditional webhook subscription API.
- By default, PostHog sends a POST request with a templated JSON body.
- You can add filters, match rules, and trigger options to control which events trigger the webhook.
- The trigger source can be events or person updates.
- The JSON body template and HTTP method are customizable.
- For complete control of your destination's behavior, you can view and edit the underlying Hog code that drives it.

**Important limitation:** Webhook destinations are configured through the PostHog UI or via the Hog Functions API (`/api/environments/:project_id/hog_functions`), not through a standalone webhook subscription API. They push PostHog event data outward rather than providing traditional event subscription endpoints.

### Incoming Webhooks

Incoming webhooks enable you to send data from external systems directly into PostHog. These are sources that provide a unique URL to receive HTTP requests and convert them into PostHog events.
