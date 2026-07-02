# Slates Specification for FullStory

## Overview

FullStory is a digital experience analytics platform that captures and replays user sessions on websites and mobile apps. It provides behavioral data insights including session replay, heatmaps, user segmentation, funnels, and metrics to help teams understand and improve digital experiences.

## Authentication

FullStory uses **API key** authentication for its HTTP/Server API.

- FullStory's HTTP APIs use API keys for authentication.
- This API key should be added to the Authorization header for all requests in the format: `Authorization: Basic {YOUR_API_KEY}`
- You can find that by navigating to Settings > Integrations > API Keys within Fullstory.
- API keys have permission levels that control access:
  - **Standard**: Can create and update data (users, events) but cannot view or delete data.
  - **Admin** or **Architect**: The API key must have Admin or Architect level permissions to view or delete data.
- An API Key is bound to the user that creates it. If that user is removed from the account, that API key will stop working.
- All API requests use the `api.fullstory.com` domain. They are automatically routed to the correct data center based on what is configured for your Fullstory account.
- The data center used is included as the first three characters of the API key.

No OAuth2 or other authentication methods are supported for the server API.

## Features

### User Management

Create, update, and retrieve user profiles in FullStory. User data can be created and modified via the Users API. Users can be identified by a FullStory-generated ID or your own external user ID (`uid`). Over time, as an anonymous user is identified across multiple devices and via the server API, they will represent a single "logical" user. A Fullstory-generated user id will remain stable and will be guaranteed to reference the same logical user after that user has been identified. Batch user imports are also supported.

### Event Capture

Event data can be created with the Events API. Send custom server-side events to enrich session data with business context (e.g., loyalty status changes, backend transactions). Events are associated with users and become searchable in FullStory. Each Fullstory account includes a maximum number of server events that can be captured within a monthly or annual cycle.

### Session Retrieval

Retrieve a list of sessions for a user using the Sessions API. Sessions can be looked up by user ID or email, and the API returns session replay URLs that can be embedded into support tools or other applications.

### Segments

Retrieve information on user segments using the Segments API. Segments are saved groups of users defined by user and event filters. Two types of segment-related data are available: individuals and events. Segment data can be exported for external analysis, with options to scope the export to matching events, pages, or full sessions.

### Data Export

Export user event and page data using the Data Exports API. This allows bulk extraction of behavioral data from FullStory. Export bundles are produced periodically and can be listed and downloaded. This feature typically requires an Admin or Architect API key.

### Privacy and Recording Settings

Fullstory's Audit Trails API provides users with a way to retrieve current settings and historical data related to blocked User Agents and IP Rules, domain capture settings, geographical block rules, element privacy rules, data capture status, console data capture, and Network data capture configuration. This is useful for compliance auditing and governance.

### Annotations

Add annotations to sessions via the API, enabling programmatic note-taking on recorded sessions for collaboration and issue tracking.

### Webhook Endpoint Management

Create, update, list, and delete webhook endpoints programmatically. This API can be used to change the destination URL, configured events, signing secret, and the enabled status of the webhook endpoint.

## Events

FullStory supports two categories of webhook-based event delivery:

### System Interaction Webhooks (v1)

System interaction webhooks allow you to notify destination systems about changes to your day-to-day usage of FullStory. Available event types include:

- **Note Created** (`note.created`): Notifies when a user of Fullstory makes a note on a recorded session.
- **Segment Created** (`segment.created`): Notifies when a user of Fullstory creates a new segment.
- **Segment Threshold Alert** (`segment.trend.alert`): Notifies when a segment-based alert triggers. Alerts can trigger when the active users in a saved segment cross a configured threshold. Can be configured for daily, weekly, or monthly active users, with above/below threshold directions.
- **Custom Event** (`recording.event.custom`): Notifies when a custom event has been processed. Custom events are created during recording via the FS.event Browser API function. The "recording.event.custom" event requires specifying a particular custom event as the subcategory.
- **Metric Alert** (`metric.alert`): Notifies when a metric alert triggers.

You must have an Admin or Architect key to view and manage webhook settings. Endpoints are configured with a URL, a signing secret for payload verification, and the set of event types to receive. This feature is paid only.

### Streams (Behavioral/Streaming Webhooks)

Streams let you build personalized workflows that trigger when users perform a specific single event or a complex series of multiple events within a given time period. Unlike system webhooks which respond to platform actions, Streams are triggered by end-user behavioral patterns during recorded sessions.

- Streams can match single events or multi-event patterns within a configurable time window.
- With Streams, the request body sent to your destination is fully customizable. Instead of a predefined schema, you use the Field Mapping interface to construct a JSON payload that matches the exact requirements of your endpoint.
- Fullstory currently supports up to 25 consecutive streams.
- Part of Anywhere: Activation. 1000 Activations per month available with Enterprise and Advanced plans.
