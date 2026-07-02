# Slates Specification for Statuspage

## Overview

Atlassian Statuspage is a hosted status page service that allows organizations to communicate incidents, outages, and scheduled maintenance to their customers. It provides tools for managing components representing infrastructure pieces, tracking incidents through their lifecycle, displaying system metrics, and managing subscriber notifications via email, SMS, webhooks, and Slack.

## Authentication

Authentication is done via an API token provided in the Statuspage management interface.

**Obtaining an API Key:**

1. Log in to your account at `https://manage.statuspage.io/login`, click on your avatar in the bottom left of your screen to access the user menu, then click **API info**.

**Passing the API Key:**

The API key can be passed in two ways:

- **Authorization header** (recommended): Pass the key as `Authorization: OAuth <your-api-key>` in the request header.
- **Query parameter**: Append `?api_key=<your-api-key>` to the request URL.

**Important considerations:**

- API keys are managed at the organization level and are associated with admin-level roles in team member accounts.
- The API key is a full read/write API key — there is no read-only key option.
- API keys created by a user stay active even if that user's access to Statuspage is revoked, to prevent disruptions to automations relying on these keys.

**Required identifiers:**

- **Page ID**: Found on the API info page alongside the API key. Most API operations are scoped to a specific page using this ID.
- **Organization ID**: Required for user management and permissions operations.

**Base URL:** `https://api.statuspage.io/v1/`

## Features

### Page Management

Manage your status page profile settings including name, domain, subdomain, time zone, branding/CSS customization, and notification preferences. Configure which subscriber types are allowed (email, SMS, webhook, RSS/Atom, Slack).

### Component Management

Components are the functioning pieces of your website or application such as your API, mobile app, help center, and admin tool. Each component has a status: `operational`, `degraded_performance`, `partial_outage`, or `major_outage`. Components can be organized into groups. Uptime data can be retrieved for components with showcase enabled, with a configurable date range up to six calendar months. Components also have an `automation_email` field that can be used for email-based status updates from monitoring tools.

### Incident Management

Create, update, and resolve incidents to communicate service disruptions. Incidents come in three types:

- **Realtime**: Unexpected issues currently affecting infrastructure. Notifications are sent to subscribers.
- **Scheduled**: Planned maintenance or outages with configurable start/end times. Options include reminding subscribers before the start, auto-transitioning to in-progress/completed states, and configurable reminder intervals.
- **Historical/Backfilled**: Past incidents imported for historical accuracy.

Incidents can be associated with specific components and their statuses. Incident statuses progress through: `investigating`, `identified`, `monitoring`, `resolved`. Impact levels include `none`, `minor`, `major`, and `critical`. Each incident update can optionally trigger subscriber notifications and Twitter posts.

### Incident Postmortems

Create, publish, and manage postmortem reports for resolved incidents. Postmortems support a draft workflow and can be published with notifications to subscribers and/or Twitter.

### Incident Templates

Create reusable templates with pre-filled names, messages, statuses, and associated components for faster incident creation.

### Subscriber Management

Subscribers are those that receive notifications via email, SMS, Slack, Microsoft Teams, or webhook to incidents that are reported and subsequently updated. Subscribers can be subscribed to the entire page, specific components, or individual incidents. The API supports creating, listing, updating, unsubscribing, and reactivating subscribers. Subscribers can be filtered by type (`email`, `sms`, `webhook`, `slack`, `teams`, `integration_partner`) and state (`active`, `unconfirmed`, `quarantined`).

### Metrics

Display system performance metrics (e.g., response time, uptime) on the status page. Custom metric data can be submitted via the API with timestamp/value pairs. Data must be submitted at least every 5 minutes and can be backfilled up to 28 days. Third-party metric providers (Pingdom, New Relic, Datadog, Librato) can be configured as metric sources.

### Page Access Control

For audience-specific pages, manage which users can view your status page and control which components and metrics each viewer can see. Users can be organized into page access groups for easier management.

### User & Permission Management

Manage team members within your organization. Assign role-based permissions per page including `page_configuration`, `incident_manager`, and `maintenance_manager` roles. Note: User management endpoints are not available for organizations using Atlassian accounts.

### Status Embed Configuration

Configure the appearance of embeddable status widgets, including colors for incident and maintenance states and widget positioning.

## Events

Statuspage supports webhook notifications that are dispatched to registered subscriber endpoints.

### Incident Updates

Statuspage can send notifications to your customers via webhooks when you create or update an incident, or update a component status. The webhook payload includes page status, full incident details, and the history of incident updates with affected components. Webhook subscribers can be scoped to the entire page or to specific components.

### Component Status Changes

Webhooks are dispatched each time a component changes status (but not for changes to name, position on the page, etc). A reference to the old value and the new value will allow your service to respond accordingly.

**Configuration:**

- Webhook subscribers can be created through the API. Webhooks are HTTP POST requests that the Statuspage servers send to the registered endpoint.
- Webhook notifications must be enabled by an administrator in the page's subscriber settings before endpoints can be registered.
- Subscribers can optionally be scoped to specific components so they only receive relevant updates.
