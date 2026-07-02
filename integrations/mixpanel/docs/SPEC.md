Now I have comprehensive information about Mixpanel. Let me compile the specification.

# Slates Specification for Mixpanel

## Overview

Mixpanel is a product analytics platform that tracks user interactions with web and mobile applications. It provides APIs for ingesting event data, managing user and group profiles, querying analytics reports (funnels, retention, segmentation), and exporting raw data. Mixpanel also supports identity management, data governance (GDPR), data pipelines to warehouses, and feature flags.

## Authentication

Mixpanel uses two primary authentication methods depending on the API being accessed:

### 1. Service Accounts (Recommended)

A service account is a special type of Mixpanel user intended to represent a non-human entity such as a script or back end service. Similar to a normal user it can be granted access to any number of projects and workspaces within an organization.

- **Mechanism:** HTTP Basic Authentication using the service account's `username` and `secret` as credentials.
- **Example:** `Authorization: Basic <base64(username:secret)>` — both base64-encoded and plain-text credentials are accepted.
- **Setup:** Created in Organization Settings → Service Accounts tab. Select the appropriate role and projects for the service account. The secret is shown once—save it.
- **Expiration:** Service accounts have no expiration by default, but an optional expiration can be set at creation time for security purposes.
- **Required for:** Query API, Event Export API, Data Pipelines API, Lexicon Schemas API, GDPR API, Warehouse Connectors API, Import Events, Lookup Tables, and Service Accounts management API.

### 2. Project Token

Most Ingestion API calls such as Import Events, Track Events, User Profiles, and Group Profiles only require a Project Token. Because these APIs are often called from client-side SDKs, credentials are not exposed; the Project Token simply identifies which project to send data to.

- **Mechanism:** Passed as a property in the event/profile payload (e.g., `"token": "<project_token>"`).
- **Setup:** Found in Mixpanel Project Settings under Access Keys.
- **Required for:** Track Events, User Profile updates, Group Profile updates (client-side ingestion).

### Regional Endpoints

Mixpanel supports different API base URLs depending on data residency:

- **Standard:** `api.mixpanel.com`
- **EU Residency:** `eu.mixpanel.com`

### Project Secret (Deprecating)

This authentication method is in the process of being deprecated. Please use Service Accounts instead. It uses HTTP Basic Auth with the project secret as the username and an empty password.

## Features

### Event Tracking and Import

Allows sending event data to Mixpanel. Events can be tracked in real-time from client devices or imported in bulk from servers. Each event includes a name, a distinct user ID, a timestamp, and custom properties. Historical events (older than 5 days) must use the Import API rather than the Track API. Import supports deduplication via an `$insert_id` property.

### User Profiles

Manage user profile properties in Mixpanel. Supports setting, incrementing, appending to, and removing properties on user profiles. Profiles can be created implicitly or updated in bulk. Useful for storing user attributes like name, email, plan type, etc., for use in analytics segmentation.

### Group Profiles

Similar to user profiles but for entity-level analytics (e.g., companies, accounts). Allows setting properties on group entities and managing group membership. Requires Group Analytics to be enabled on the Mixpanel project.

### Identity Management

Manage how Mixpanel links anonymous and identified users. Supports creating identities, creating aliases, and merging distinct IDs. This is essential for connecting pre-login anonymous activity with post-login identified user activity.

### Query and Analytics Reports

Query pre-built analytics reports programmatically, including:

- **Insights:** Query saved insight reports.
- **Funnels:** Query saved funnel reports and list available funnels.
- **Retention:** Query retention and frequency reports.
- **Segmentation:** Query event segmentation with options for numerical bucketing, summing, and averaging.
- **Cohorts:** List saved cohorts.
- **Engage:** Query user profiles with filters and expressions.
- **Event Breakdown:** Get aggregate event counts, top events, and top event properties.
- **Activity Feed:** View a specific user's event activity stream.
- **JQL:** Run custom JavaScript-based queries for advanced analysis.

### Raw Data Export

Export raw event data for a specified date range. Returns individual event records with all properties. Useful for feeding data into external systems or performing custom analysis outside Mixpanel.

### Data Pipelines

Configure continuous export pipelines from Mixpanel to external data warehouses (e.g., BigQuery, Snowflake, S3). Pipelines can be created, edited, paused, resumed, and deleted. Supports monitoring pipeline status and sync logs.

### Warehouse Connectors (Import)

Import data from external data warehouses into Mixpanel. Supports creating import configurations for event streams, user profiles, group profiles, and lookup tables. Allows scheduling and running imports.

### Lookup Tables

Manage lookup tables that enrich event data with additional metadata. For example, mapping product IDs to product names. Supports listing and replacing lookup tables.

### Lexicon Schemas (Data Definitions)

Manage metadata definitions for events, properties, and other entities. Schemas can be created, listed, and deleted. Useful for maintaining data governance and documentation of your tracking plan.

### Annotations

Create and manage annotations on project timelines. Annotations mark significant events (e.g., product launches, incidents) that can help contextualize analytics data. Supports tagging annotations for categorization.

### GDPR Compliance

Submit data retrieval and deletion requests for individual users to comply with GDPR and privacy regulations. Supports checking the status of requests and canceling pending deletions.

### Service Account Management

Programmatically create, delete, and manage service accounts within an organization. Control project-level access and roles for service accounts.

### Feature Flags

Retrieve feature flag definitions and evaluate flag variant assignments for users. Allows checking which feature flag variants a specific user should see.

## Events

Mixpanel has limited webhook/event subscription support. It does not offer a general-purpose webhook system for arbitrary event notifications.

### Cohort Sync Webhooks

This capability allows you to export cohorts to destinations that do not have a native Mixpanel integration. When configured, Mixpanel sends POST requests to a specified webhook URL whenever cohort membership changes.

- **Actions sent:** `members` (full cohort list on first sync or refresh), `add_members` (users entering the cohort), and `remove_members` (users exiting the cohort).
- Cohorts are synced once every 30 minutes.
- The batch size is set to 1000 users per call to add_members or remove_members.
- Each webhook payload includes the cohort name, ID, description, member details (email, distinct ID, name, phone), and pagination info for large cohorts.
- Supports optional Basic Authentication on the webhook URL.
- Configured via Mixpanel's Integrations UI by providing a webhook URL and connection name.
