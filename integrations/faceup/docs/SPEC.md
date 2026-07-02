Now let me get more details on the FaceUp API capabilities and webhook event types.Now I have enough information to write the specification.

# Slates Specification for Faceup

## Overview

FaceUp is a whistleblowing and compliance case management platform that enables organizations to receive anonymous reports of misconduct, manage investigations, and maintain audit trails. It provides secure reporting channels (web, mobile, hotline) and structured case handling workflows for compliance officers, HR teams, and legal departments.

## Authentication

FaceUp uses **API key** authentication combined with a **region** identifier.

To authenticate:

1. **API Key**: Log into your FaceUp admin account, navigate to the **Integrations** tab, then go to the **API Keys** section and create a new key.
2. **Region**: Navigate to the **Settings** tab and copy the **Data hosting region** value (e.g., `eu`, `us`).

All API requests are sent as POST requests to the GraphQL endpoint:

```
https://www.api.faceup.com/graphql
```

Include the following headers with each request:

- `Authorization`: Your API key value
- `X-Region`: Your data hosting region

Example:

```
Authorization: <your_api_key>
X-Region: <your_region>
```

## Features

### Report Statistics

Query aggregated reporting statistics, such as report counts by month, filtered by date range. Useful for dashboards and compliance reporting.

- Parameters: `dateFrom` to filter statistics from a specific date.

### Report Monitoring

Monitor and retrieve information about whistleblower reports submitted through the platform, including case details and status.

### Internal Comments

Access internal comments made by investigators and administrators on cases, enabling integration with external case tracking or project management tools.

### Message Tracking

Track messages exchanged between reporters and case handlers through FaceUp's anonymous two-way communication channel.

### Case Management Integration

Connect FaceUp case data with external tools (e.g., Asana, ClickUp, Slack) to automatically create tasks or send notifications when new cases or updates occur.

**Note:** FaceUp uses a GraphQL API, so all queries and mutations are sent to a single endpoint. The publicly documented API surface appears limited primarily to reading statistics and monitoring reports, messages, and comments. Full API schema details may require introspection or direct consultation with FaceUp support.

## Events

FaceUp supports **webhooks** for real-time event notifications. Webhooks are configured through the FaceUp administration UI under **Integrations → Webhooks**.

To set up a webhook, provide a name, a destination URL, and select the event types you want to receive.

### New Report

Triggered when a new whistleblower report is submitted through any reporting channel. Useful for alerting case managers or creating tasks in external systems.

### New Message

Triggered when a new message from a report sender (whistleblower) is received on an existing case. Enables real-time follow-up and notification workflows.

### New Internal Comment

Triggered when an internal comment is added to a case by an investigator or administrator. Useful for syncing investigation activity with external collaboration tools.
