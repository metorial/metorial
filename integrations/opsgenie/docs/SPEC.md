# Slates Specification for OpsGenie

## Overview

OpsGenie (by Atlassian) is an incident management and alerting platform that routes alerts to the right on-call responders using schedules, escalation policies, and routing rules. Through its API, you can create alerts and configure users, on-call schedules, and teams for third-party applications. Note: Atlassian has announced the end of support for Opsgenie and will discontinue new sales; owners can migrate to Jira Service Management or Compass.

## Authentication

OpsGenie uses API key-based authentication. Authentication is mandatory for all REST API requests. Two methods are supported: `Authorization: GenieKey $apiKey` or `Authorization: Basic base64(:$apiKey)`.

There are two types of API keys:

1. **Integration API Keys**: API keys are available within integration pages. Use these keys to receive integration requests and make API requests. Team integration keys can only be used for alerts/incidents of the specific team, whereas global integration keys can be used for all API requests including account-based configurations.

2. **Account-level API Keys**: API keys can also be created separately for global configuration requests, not tied to any integration, managed from the API Key Management tab in Settings. Account owners and global admins can generate these keys with different access rights. They can be used for configuration requests, some Alert API requests like Get Alert and List Alerts, and Incident API requests. However, Create Alert, Acknowledge Alert, Close Alert, and Add Note to Alert are blocked for these keys.

Access rights for account-level API keys include: Read (alerts, incidents, configurations), Create/Update (configurations and incidents), Delete (alerts, incidents, configurations), and Configuration Access (whether the key can access configurations).

**Base URLs:**

- US instance: `https://api.opsgenie.com`
- EU instance: `https://api.eu.opsgenie.com`

## Features

### Alert Management

Create, retrieve, update, close, acknowledge, and delete alerts. Alert creation, deletion, and action requests are processed asynchronously. Alerts support rich metadata including message, description, priority (P1–P5), responders (teams, users, escalations, schedules), tags, custom actions, visibility controls, and custom key-value details. Additional alert actions include snoozing, assigning ownership, adding notes, and adding tags.

### Incident Management

The Incident API is only available to Standard and Enterprise plans. Create and manage incidents with responders, priority levels, tags, impacted services, status page entries, and stakeholder notifications. Incidents can be resolved and their associated alerts retrieved.

### On-Call Schedule Management

Create, update, and delete schedules programmatically. Quickly adapt on-call personnel based on shifts or role changes. Schedules support rotations (daily, weekly, monthly, custom) with multiple participants, and overrides for temporary coverage changes. You can also query who is currently on-call and who is next on-call for a given schedule.

### Escalation Policy Management

Create and manage escalation policies that define the order and timing of notifications when alerts are not acknowledged. Escalations are used to notify responders according to a given order. After an escalation is added as a responder to an alert, the escalation rules notify responders when the specified time is over and the state of the alert meets the specified conditions. Policies support repeat configurations with customizable intervals.

### Team Management

Create and manage teams, including team members, roles, and team-level routing rules. Teams serve as the organizational unit for on-call schedules, escalation policies, and alert routing.

### User Management

Create, retrieve, update, and delete users. Manage user contact methods, notification rules, and notification rule steps. Users can be assigned roles (Owner, Admin, User, Stakeholder) and configured with timezone, locale, and address details.

### Service Management

The Service API is only available to Standard and Enterprise plans. Create, update, delete, and list services associated with teams, including tags and descriptions.

### Integration Management

Programmatically create, list, update, enable/disable, and authenticate integrations. Configure integration-level access permissions (read, write, delete, configuration access) and define responders and notification suppression settings. The Integration API does not support Zendesk, Slack, and Incoming Call integrations.

### Notification Rule Management

Configure per-user notification rules that control how and when users receive notifications based on alert criteria, including notification steps with delays and contact method preferences.

## Events

OpsGenie supports outbound webhooks for alert activity through its Webhook Integration.

### Alert Activity Webhooks

Opsgenie can call a web-accessible URL endpoint (webhooks) and pass alert activity data. You configure mappings that define which alert actions trigger a POST to your URL.

Supported alert actions that can trigger webhooks:

- The "action" field value can be "Create", "Acknowledge", "AddNote", "AssignOwnership", "Close", "Delete", or name of a custom action.
- Additional actions include "a tag is added to the alert" and "a custom action is executed on alert", which allow filtering by specific tag values or custom action names.

Webhook data includes alert activity (create, acknowledge, etc.) as well as a subset of the alert fields (alert ID, username, alias, entity, user ID) as part of the HTTP request payload (JSON). Sending alert description and alert details is only available for Create and Custom actions. Custom headers can be added to webhook calls. The webhook integration is configured through Settings > Integrations in the OpsGenie UI.
