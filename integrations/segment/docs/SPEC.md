# Slates Specification for Segment

## Overview

Segment (by Twilio) is a customer data platform that collects, unifies, and routes customer event data from websites, apps, and servers to hundreds of analytics and marketing tools. It provides two main APIs: a Tracking API for ingesting event data (identify, track, page, screen, group, alias calls) and a Public API for programmatically managing workspace resources like sources, destinations, warehouses, and tracking plans.

## Authentication

Segment has two distinct APIs with different authentication methods:

### Public API (Workspace Management)

The Segment Public API uses API Tokens to authenticate and authorize requests. API Tokens are unique and scoped to the Segment Workspace in which you create them.

- **Token creation:** Navigate to Settings > Workspace settings > Access Management > Tokens. Click + Create Token. Create a description for the token and assign it either Workspace Owner or Workspace Member access. Click Create. Copy your workspace token somewhere secure and click Done.
- **Usage:** Include the Public API Token in your HTTP requests. Configure the Authorization Header as a Bearer Token with the value of the newly generated Public API token. Example: `Authorization: Bearer <token>`
- **Permissions:** Only users with the Workspace Owner role can create a Public API token. Tokens can be assigned Workspace Owner or Workspace Member access levels.
- **Scope:** You must create a separate API Token for each Workspace you want to manage using the Segment Public API.
- **Availability:** The Public API is available to Team and Business Tier customers.
- **Base URL:** `https://api.segmentapis.com`
- **Server-side only:** The Public API is used for server-side only.

### Tracking API (Data Collection)

Choose between writeKey authentication, basic authentication and OAuth to authenticate requests.

1. **Write Key authentication:** Authenticate to the Tracking API by sending your project's Write Key along with a request. The authentication writeKey should be sent as part of the body of the request. No authorization header is needed.

2. **HTTP Basic authentication:** Basic authentication uses HTTP Basic Auth, which involves a username:password that is base64 encoded and prepended with the string Basic. In practice that means taking a Segment source Write Key, 'abc123', as the username, adding a colon, and then the password field is left empty. After base64 encoding 'abc123:' becomes 'YWJjMTIzOg=='. Example: `Authorization: Basic YWJjMTIzOg==`

3. **OAuth 2.0 (client credentials):** Uses a JWT-based client assertion flow. To use the access token in the HTTP API Source, use access_token in the header and write_key in the payload. You can reuse the access token until the expiry period specified on the OAuth application. OAuth apps are configured in workspace settings under Access Management > OAuth application.

- **Base URL:** `https://api.segment.io/v1/` (US) or regional endpoints for EU.

## Features

### Source Management

Create, list, update, and delete data sources that collect customer data. Sources represent websites, mobile apps, servers, or cloud services that send data into Segment. You can manage write keys, configure schema settings, and view connected destinations and warehouses for each source.

### Destination Management

Create, configure, enable/disable, and delete destinations where Segment routes collected data (e.g., analytics tools, data warehouses, marketing platforms). Supports destination subscriptions (action-based mappings) and delivery metrics monitoring.

### Destination Filters

Define conditional or universal filters that control which events are forwarded to specific destinations. Useful for dropping, sampling, or transforming events before they reach a destination.

### Event Data Collection (Tracking API)

Send customer data to Segment using standardized calls:

- **Identify:** Tie a user to their traits (e.g., email, name).
- **Track:** Record user actions/events with properties.
- **Page/Screen:** Record page views (web) or screen views (mobile).
- **Group:** Associate a user with a group/organization.
- **Alias:** Merge two user identities.
- Supports historical data import via the `timestamp` field.

### Tracking Plans (Protocols)

Create and manage tracking plans that define expected event schemas. Connect tracking plans to sources to validate incoming data. The Tracking Plan feature allows you to validate your expected events against the live events that are delivered to Segment. Violations generate when an event doesn't match the spec'd event in the Tracking Plan. Supports managing rules (JSON Schema-based) programmatically.

### Warehouse Management

Create and configure data warehouses (e.g., BigQuery, Snowflake, Redshift) to receive Segment data. Connect sources to warehouses, manage selective syncs to control which collections and properties are synced, and configure advanced sync schedules.

### Reverse ETL

Define models that query your data warehouse and sync results back to downstream destinations. Create, update, and manage reverse ETL models, trigger manual syncs, and monitor sync statuses.

- Supports configurable sync schedules (interval-based, cron-based, or manual).

### Functions

Create custom JavaScript functions that run within Segment's infrastructure to act as sources, destinations, or insert middleware. Manage function deployments and versions, with the ability to restore previous versions.

### Audiences and Computed Traits (Engage/Unify)

Create and manage audiences based on user behavior and traits. Configure audience schedules, preview audience membership, and activate audiences by connecting them to destinations. Computed traits allow defining calculated user-level attributes based on event history.

### Spaces and Profiles

Manage Segment Spaces (identity resolution namespaces) and messaging subscriptions. Sync unified profiles to warehouses with configurable selective sync settings.

### Transformations

Create transformations that modify events in-flight, such as renaming events or properties, before they reach destinations.

### Identity and Access Management

Manage workspace users, user groups, invites, and role-based permissions programmatically. Create and manage labels for organizing resources. View audit trail events for workspace activity.

### Catalog Browsing

Browse the full catalog of available source, destination, and warehouse integrations offered by Segment, including their metadata, configuration options, and supported features.

### Usage and Monitoring

Query workspace-level and per-source API call usage, monthly tracked users (MTU), and event volume metrics. Monitor event delivery with detailed ingress/egress success and failure metrics.

### Deletion and Suppression

Create regulation requests to delete or suppress user data across sources or the entire workspace, in compliance with privacy regulations (e.g., GDPR). List and manage suppression lists.

## Events

Segment supports forwarding event data to external webhooks as a destination, but does not provide a native webhook/event subscription mechanism for listening to changes in workspace configuration or management-level events.

### Webhooks Destination (Outbound Event Streaming)

Segment Webhooks submit real-time user data to your own HTTP endpoints. A Webhook is an HTTP callback: a simple event-notification using HTTP POST.

- Forwards all Segment Spec event types (Identify, Track, Page, Screen, Group, Alias) to configured webhook URLs.
- Specify up to five different Webhook URLs you would like to forward data to.
- Supports custom headers and shared secret authentication (HMAC SHA1 signature via `X-Signature` header).
- The Webhooks (Actions) variant supports POST, PUT, or PATCH methods with configurable mappings and conditions to control which events are sent.

**Note:** These webhooks are a _destination_ that forwards Segment tracking data outward. Segment does not offer inbound webhook subscriptions or event notifications for workspace configuration changes (e.g., source created, destination updated).
