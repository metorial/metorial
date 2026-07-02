Now let me get more details on the Pendo Engage API endpoints and webhook event categories.Now let me get details on the Engage API endpoints to understand the full feature set.Now I have enough information to write the specification. Let me also check the Pendo API base URLs for different regions.

# Slates Specification for Pendo

## Overview

Pendo is a product analytics platform that helps software companies understand user behavior, collect feedback, and deliver in-app guidance. It provides APIs for managing visitors, accounts, guides, segments, metadata, and for querying aggregated product usage data. Pendo also offers a separate Feedback API for the legacy feature request and prioritization tool.

## Authentication

Pendo uses API key-based authentication. There are two separate APIs with different authentication mechanisms:

### Engage API (Core API)

Authentication of requests is handled by an integration key. The key is passed as `x-pendo-integration-key` in the request header.

**Generating an integration key:**
You must have Pendo admin permissions and integration key access to set up integrations. Subscription admins can enable this feature. Navigate to **Settings > Integrations** and create an integration key from the **Integration Keys** section.

The integration key isn't tied to a specific application in your subscription. The integration key provides access to all applications in the Pendo subscription.

**Base URL** depends on your data center region:

- US: `https://app.pendo.io/api/v1/`
- EU: `https://app.eu.pendo.io/api/v1/`

### Feedback API (Legacy)

Generate an API Key at the Feedback vendor settings page. This key should then be added to every request as a request header named `auth-token` (preferred), or as a query parameter named `auth-token`.

**Base URL** depends on your data center:

- API endpoint is `https://api.feedback.eu.pendo.io` or `https://api.feedback.us.pendo.io` depending on where your datacenter is located.

## Features

### Visitor and Account Management

Retrieve, create, and update visitor and account records in Pendo. You can send metadata into Pendo through integrations or the API. Once received, metadata must be configured to behave correctly across analytics, segmentation, and reporting. Metadata can include custom fields like department, role, subscription status, or any other attributes relevant to your users and accounts. You can also bulk-delete visitors and accounts.

### Guide Management

Manage guides, segments, and metadata programmatically. Guides are in-app messages (tooltips, modals, walkthroughs) that can be created, updated, and retrieved via the API. You can read guide configuration, deployment status, and step details.

### Segment Management

Segments let you group visitors and accounts based on metadata and product usage so that you can filter your analytics data and target guides to specific users. You can also create and manage segments using the API. Segments can use rules based on metadata fields, product usage patterns, and event properties.

### Data Aggregation and Analytics

Aggregations are a query language for accessing and processing Pendo data. They take sources of Pendo data and apply operators to do computations. They run in the context of a given Pendo subscription and are written in JSON. Data querying is performed using a flexible aggregation pipeline modeled after MongoDB.

Available data sources for aggregation include:

- **Page events** — page views and time on page per visitor/account.
- **Feature events** — feature click interactions.
- **Guide events** — guide display and interaction data.
- **Poll responses** — survey and NPS response data.
- **Track events** — custom events sent to Pendo.

The Engage API doesn't include endpoints to export report contents for paths, funnels, workflows, retention, and Data Explorer.

### Track Events

Configure Track Events to represent user interactions not captured automatically. Track Events allow you to send custom events to Pendo from both client-side and server-side sources. You can capture a variety of data as event properties attached to Track Events. This could include window size, text on the page, server-side information that doesn't exist on your website, and more. Event properties consist of key-value pairs.

- Server-side Track Events require a separate **Track Event shared secret key** (different from the integration key).

### Feedback Management (Legacy)

The Feedback API is for working with classic Pendo Feedback, the legacy feature request and prioritization tool. This API allows you to retrieve and manage feedback requests, access product areas and classic roadmap data, and integrate classic Feedback data into internal systems.

## Events

Pendo supports webhooks that send real-time notifications when specific events occur. You must have subscription admin permissions to configure and manage webhooks. Webhooks can be configured under **Settings > Integrations > Webhooks**.

Webhooks support two destination types: URL webhooks (where the receiving platform generates a unique URL) and Twilio Segment webhooks (which send events in Segment's preferred format).

You can select individual event categories to choose which event categories to send. There's no additional filtering in Pendo after you choose event categories.

Webhook payloads are signed with a shared secret using SHA-256 HMAC via the `X-Pendo-Signature` header.

### Event Categories

Events that can push a notification with webhooks include:

- **Guide Displayed** — Triggered when an in-app guide is shown to a visitor. Includes guide ID, step ID, and guide properties.
- **Track Event Received** — Triggered when a custom Track Event is received by Pendo. Includes event name, source, and event properties.
- **NPS Survey Displayed / Submitted** — Triggered when an NPS survey is shown to or completed by a visitor.
- **Poll Displayed / Submitted** — Triggered when an in-app poll is shown to or completed by a visitor.
- **Visitor Created** — Triggered when a visitor is first seen in-app.
- **Account Created** — Triggered when an account is first seen in-app.
- **Visitor Unsubscribed from Orchestrate Emails** — Triggered when a visitor unsubscribes from emails sent through Pendo Orchestrate.

Creating a visitor or account via API does not trigger the webhook — it only fires when the visitor is identified in-app. You cannot format, filter, or modify the webhook message being sent by Pendo. Any transformation or filtering would have to be done on your end after receiving the webhook.
