# Slates Specification for Bugsnag

## Overview

Bugsnag (now part of SmartBear's Insight Hub) is an error monitoring and application stability management platform that captures crashes and errors in real-time from web, mobile, and desktop applications. It provides APIs for accessing error and project data, tracking releases and builds, reporting error events and sessions, and sending OpenTelemetry span data for performance monitoring.

## Authentication

All requests to the Bugsnag API require authentication.

### Personal Auth Token (Recommended)

Personal auth tokens are the primary and recommended authentication method for the Bugsnag Data Access API. Tokens can be generated in the Bugsnag dashboard under **My Account → Personal Auth Tokens** by selecting "Generate New Token".

The token can be sent in two ways:

1. **Authorization header** (preferred): `Authorization: token YOUR-AUTH-TOKEN`
2. **Query parameter**: `?auth_token=YOUR-AUTH-TOKEN`

The API base URL is `https://api.bugsnag.com`.

### User Credentials (On-Premise Only)

For on-premise Bugsnag installations, you can authenticate using Basic Authentication with dashboard email and password credentials. This method is not available for cloud-hosted Bugsnag. This method is unavailable when using multi-factor authentication.

**Note:** Bugsnag also uses a separate **Project API Key** (found in project settings) for the Error Reporting and Session Tracking APIs used by SDKs to send error/session data. This is distinct from the personal auth token used for the Data Access API.

## Features

### Organization & Project Management

Manage organizations and projects within Bugsnag. Create, view, update, and delete organizations and projects. Regenerate API keys for projects. Configure project settings including stability targets and release stages.

### Error & Event Access

Access information about your Bugsnag errors, projects, organization and more. List, view, update, and delete errors and individual error events within projects. Update error status (open, fixed, snoozed, ignored) and assign errors to collaborators. Bulk update multiple errors at once. Events and errors can be filtered using any of the filters available in the Bugsnag dashboard, including by error class, severity, release stage, user, device, browser, OS, and custom fields.

### Error Trends & Pivots

View trend data for errors and projects over time. Analyze error distributions using pivots to break down errors by various dimensions such as device, browser, OS, or custom fields.

### Release Tracking

Provide extra information whenever you build, release, or deploy your application. List and view releases on a project or release group. Manage release groups and view project stability trends over time.

### Error Reporting & Session Tracking

Report details of errors and sessions from your applications, required for release stability scores. This is typically used by Bugsnag SDKs rather than called directly.

### Performance Monitoring (Traces & Spans)

Send OpenTelemetry span data to show performance data in your dashboard. List and view span groups, span group summaries, timelines, and distributions. Access individual spans and traces. Manage performance targets and network grouping rulesets.

### Feature Flags

List, view, and delete feature flags on a project. View feature flag summaries, error overviews per flag, and variant-level error breakdowns. Star/unstar feature flags for quick access.

### Collaborator & Team Management

Invite, list, update, and remove collaborators within an organization. Manage collaborator permissions and project access. Create and manage teams, add/remove team members, and configure team-level project access.

### Integration Management

List supported integrations, configure integrations on projects, and manage integration settings including trigger configurations. Test integrations and view integration connection details.

### Saved Searches

Create, view, update, and delete saved searches that store filter configurations for quick access to frequently used error views.

### GDPR & CCPA Compliance

The Data Access APIs enable you to retrieve and delete data that relate to individual users to ensure compliance with GDPR and CCPA legislation. Create event data requests to export user data and event deletion requests to remove user data.

### SCIM Provisioning

Manage collaborators and groups via the SCIM protocol for automated user provisioning from identity providers.

### Error Assignment Rules

Configure rules to automatically assign errors to specific collaborators based on patterns.

## Events

Bugsnag supports webhooks for real-time notifications about error-related events. Webhooks are configured per project under **Project Settings → Integrations and Email → Data Forwarding → Webhook**. You provide a URL to receive POST requests with JSON payloads containing detailed error and event information.

### Error Occurrence Events

- **New error**: Triggered when the first event of an error (per release stage) is received that matches your filters.
- **Every error occurrence**: Triggered every time an event matching your filters is received.
- **Frequent error**: Triggered when an error receives a configurable number of events, or impacts a configurable number of users, within a configurable time interval.
- **Error milestone**: Triggered when the number of events of an error reaches a milestone (10th, 100th, 1000th, and every subsequent 1000th event).

### Error Status Events

- **Error reopened**: Triggered when an error marked as fixed or snoozed receives an event that causes it to be reopened.

### Project-Level Events

- **Error spike**: Triggered when there is an overall spike in errors matching your filter.
- **New release**: Triggered every time a new release in a selected release stage is detected.
- **Rate limiting**: Triggered each day when your project is being rate-limited.

### Collaboration Events

- **Comment on error**: Triggered when a collaborator adds a comment to an error that matches your filter.

### Webhook Filtering Options

Webhook notifications support filtering by release stage, error type (handled/unhandled), severity (error, warning, info), and error status. Advanced filtering using saved filtersets is available on Preferred and Enterprise plans, enabling filtering on any field available in the dashboard filter bar.
