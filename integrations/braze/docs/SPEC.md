# Slates Specification for Braze

## Overview

Braze is a customer engagement platform that enables businesses to send personalized messaging across channels including email, push notifications, in-app messages, SMS, and webhooks. It provides a REST API to track users, send messages, export data, and more. The platform also supports multi-step customer journeys (Canvases), audience segmentation, catalogs, and real-time event streaming via Currents.

## Authentication

Braze uses **REST API keys** for authentication. A REST API key is a unique code that you pass into an API to authenticate the API call and identify the calling application or user.

**How it works:**

- The `api_key` is included in each request as a request header (`Authorization: Bearer YOUR-API-KEY`) and acts as an authentication key.
- API keys are created in the Braze dashboard under **Settings > APIs and Identifiers**.
- When you create a new REST API key, you need to give it access to specific endpoints. By assigning specific permissions to an API key, you can limit exactly which calls an API key can authenticate.

**Required inputs:**

1. **REST API Key**: Generated from the Braze dashboard with appropriate endpoint permissions.
2. **REST Endpoint URL (Instance URL)**: Braze manages a number of different instances for its dashboard and REST endpoints. When your account is provisioned, you log in to one of the available URLs. Use the correct REST endpoint based on which instance you are provisioned to. Examples include `https://rest.iad-01.braze.com` (US-01), `https://rest.iad-06.braze.com` (US-06), `https://rest.fra-01.braze.eu` (EU-01), etc.

**Permissions/Scopes:**

Each API key can be scoped to specific endpoint categories such as: Campaigns, Canvas, Catalogs, Content Blocks, Custom Events, Email, Email Templates, KPI, Media Library, Purchases, Preference Center, Schedule Messages, SCIM, SDK Authentication, Segments, Send Messages, SMS, Subscription Groups, Templates, and User Data.

**Additional authentication methods:**

- **SCIM Token**: For SCIM (user provisioning) endpoints, you need a SCIM token and must use your service origin as the `X-Request-Origin` header. SCIM is only available on Pro and Enterprise plans.
- For additional security, you can specify a list of IP addresses and subnets allowed to make REST API requests for a given REST API Key (IP allowlisting).

## Features

### User Data Management

Track and manage user profiles by logging attributes, custom events, and purchases from external systems. Create, update, merge, and delete user profiles. Users can be identified by external ID, Braze ID, user alias, email, or phone number.

### Messaging

Send messages across multiple channels (email, push, in-app, SMS, Content Cards, webhooks) either immediately or on a schedule. Supports one-off sends, API-triggered delivery for campaigns and Canvases, and transactional emails. Messages can be scheduled, updated, or cancelled.

### Campaigns & Canvas Management

Export campaign and Canvas metadata, analytics, and time series data. Trigger API-triggered campaigns and Canvases programmatically. Canvas is Braze's multi-step journey builder.

### Audience Segmentation

Export segment lists, retrieve segment details and estimated sizes over time. Export users within a segment or Global Control Group.

### Catalogs

Create and manage product catalogs for use in personalization. Supports CRUD operations on catalogs, catalog items, fields, and selections.

### Subscription Groups

Manage user subscription states for email and SMS. Query and update subscription group membership in bulk.

### Email Management

Manage email spam lists, hard bounce lists, and invalid email addresses. Query and remove addresses from blocklists.

### SMS Management

Query and manage invalid phone numbers.

### Content Blocks & Templates

Create, list, and update reusable email Content Blocks and email templates.

### Preference Centers

Create and manage email preference centers that allow end users to control their notification preferences.

### Data Export & Analytics

Export KPIs, session data, custom event analytics, and campaign/Canvas performance metrics. Export user profiles individually or by segment.

### Media Library

Upload assets to the Braze media library.

### Dashboard User Provisioning (SCIM)

The SCIM specification is designed to make managing user identities in cloud-based applications and services easier. Use the Braze SCIM endpoints to manage automated user provisioning. Create, read, update, and delete dashboard user accounts. Available on Pro/Enterprise plans only.

### Outbound Webhooks

A webhook is an automated message from one system to another after a certain criteria has been met. In Braze, this criteria is usually the triggering of a custom event. At its core, a webhook is an event-based method for two separate systems to take effective action based on data transmitted in real time. Webhooks in Braze are configured as outbound messages within campaigns or Canvases to send data to external systems when specific user actions or conditions are met.

## Events

Braze supports real-time event streaming through **Braze Currents**, a dedicated data streaming product.

### Currents – Message Engagement Events

Events associated with messages sent via Braze, such as Email Clicks, Mobile Push Opens, In-App Message Impressions, and much more. Covers delivery, open, click, bounce, spam complaint, and unsubscribe events across all messaging channels (email, push, SMS, in-app messages, Content Cards, webhooks).

- Events are streamed to a configured partner/destination (data warehouses like S3, GCS, Azure Blob Storage, or analytics partners like Segment, mParticle, Amplitude, etc.).
- You can select which specific message engagement event types to include.

### Currents – Customer Behavior Events

User Behavior Events: events associated with customer behavior, such as Sessions, Custom Events, and Purchases. These track how users interact with your app or website, including app sessions, custom event occurrences, and purchase events.

- You can select which specific behavior event types to include.

**Important considerations:**

- Currents is a real-time data stream of engagement events. It provides data in an Avro file type to data partners.
- A Currents connector is already included in many pro and enterprise-level packages. It requires a specific entitlement or license.
- Currents streams data to preconfigured partner destinations rather than arbitrary webhook URLs. Supported destinations include data warehouses (S3, GCS, Azure) and analytics/CDP partners (Segment, mParticle, Tealium, RudderStack, Amplitude, Mixpanel, etc.).
