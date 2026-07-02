# Slates Specification for Amplitude

## Overview

Amplitude is a product analytics platform that enables teams to track user behavior, analyze engagement, measure retention, and run experiments. It provides APIs for ingesting event data, querying analytics, managing cohorts, running feature experiments, and administering users and projects.

## Authentication

Amplitude uses several authentication methods depending on the API being accessed:

### 1. API Key + Secret Key (Basic Authentication)

The Amplitude APIs use Basic Authentication with your API key and Secret key. This API uses basic authentication, using the API key and secret key for your project. Pass base64-encoded credentials in the request header like `{api-key}:{secret-key}`. `api-key` replaces username, and `secret-key` replaces the password.

This is the primary authentication method used for most Analytics APIs (Dashboard REST API, Export API, Behavioral Cohorts API, Taxonomy API, etc.).

- **API Key**: Amplitude identifies projects using API Keys associated with a single project. The scope of what API keys can be used for is limited to the bare minimum needed to ingest data into Amplitude. API Keys are considered public.
- **Secret Key**: A secret key authenticates you to server-side APIs that read or modify project data. Secret keys must be kept confidential. Amplitude doesn't store secret keys, and there's no way to retrieve it.

Both keys are found under **Organization Settings > Projects** in the Amplitude web app.

**Region-specific hostnames**: For EU residency server, use `analytics.eu.amplitude.com`. The default US endpoint is `amplitude.com`.

### 2. User Profile API Authentication

This API uses an Authorization header. Use your project's Secret Key in the format: `Api-Key SECRET_KEY`.

### 3. API Tokens (Amplitude Data)

Use API Tokens to authenticate to Amplitude Data without logging in with your email address and a password. Tokens authorize applications to enjoy the same roles and permissions granted to you when you log in directly. You can create and revoke these as needed by navigating to Data > Settings > API Tokens.

### 4. Experiment Management API Key

The management API uses the HTTP Authorization header for authentication. The header must be: `Authorization: Bearer <management-api-key>`. Management API keys are different from the deployment keys used to fetch flag variants. They're created and managed via the Management API link in the Experiment sidebar.

### 5. Experiment Deployment Keys

When you create a deployment, Experiment creates a key for that deployment. Whether the key is public or private depends on whether the deployment is client-side or server-side. Client-side keys are prefixed with `client-` and server-side keys with `server-`.

### 6. SCIM Key (Enterprise only)

The SCIM key is used with the SCIM API. SCIM features are available in accounts with an Enterprise plan. Generated under **Access and SSO Settings > Provisioning Settings**. Used as a Bearer token.

### 7. Org-level API Key + Secret Key

Some APIs require an org-level API Key and Secret Key. You must request these from Amplitude Support. Used for APIs like the Data Subject Access Request API.

## Features

### Event Ingestion

Send event data to Amplitude from servers or clients. The Amplitude HTTP V2 API provides a way to send event data directly from your server to Amplitude's endpoint. Events include a user identifier, event type, timestamp, and custom event properties. A Batch API variant is also available for high-volume ingestion.

### User Identity Management

Use the Identify API to modify the user properties of a particular user without sending an event. You can modify Amplitude default user properties as well as custom user properties you've already defined. The Group Identify API extends this to group-level properties. The User Mapping (Aliasing) API allows merging user identities across devices.

### Dashboard Analytics Queries

Use the Dashboard REST API to get any data that dashboard graphs can display. This includes:

- Active/new user counts over date ranges
- Event segmentation with filters and group-bys
- Funnel analysis
- Retention analysis
- User session metrics
- User composition (property distribution)
- Fetching results from any saved chart by chart ID

### Raw Data Export

Export all events data for a given app that occurred within a specified range of dates. The results come back as a zipped archive of JSON files with one or multiple files per hour.

### User Profile Lookup

The User Profile API serves Amplitude user profiles, which include user properties, computed user properties, a list of cohort IDs of cohorts that the user is in, and recommendations.

- Not available for EU data region customers.

### Behavioral Cohorts

Get all discoverable cohorts for an app. Use the id for each cohort returned in the response to get a single cohort. Generate a new cohort or update an existing cohort by uploading a set of User IDs or Amplitude IDs.

- Maximum cohort size of 2 million users.

### Taxonomy Management

Programmatically manage your tracking plan. Create, update, delete, and restore event types, event properties, user properties, and event categories. Event categories are a way to organize your event types into broad groups.

### Attribution

Associate users from various attribution campaigns on Amplitude.

### Chart Annotations

Manage annotations on charts (e.g., marking releases or milestones on time-series charts).

### Feature Flags and Experiments

Manage feature flags and experiments through the Experiment Management API. Create, update, and configure experiments, flags, and deployments. Evaluate flag variants for users using deployment keys.

### User Privacy

Supports deletion of user data and Data Subject Access Request (DSAR) compliance for GDPR/CCPA. DSAR requests are asynchronous — you submit a request, poll for status, then download resulting files.

### Lookup Tables

Upload and manage lookup tables that enrich event data with additional metadata (e.g., mapping product IDs to product names).

### SCIM User Provisioning (Enterprise)

The User Management API follows the SCIM 2.0 Standard. It allows for the creation, retrieval, update, and deletion calls for users (including pending users) and permission groups. Integrates with identity providers like Okta and JumpCloud.

## Events

Amplitude supports outbound event streaming via webhooks, allowing you to forward data from Amplitude to external systems.

### Event Streaming via Webhooks

Amplitude's Webhook integration enables you to forward your Amplitude events and users to custom webhooks. This is a light-weight way to set a stream of event and user data out of Amplitude, to a URL of your choosing to enable any of your use cases.

Two categories of data can be streamed:

- **Events**: When enabled, events are automatically forwarded to the webhook when they're ingested in Amplitude. You can filter which specific events are sent. Payloads can use the default Amplitude format or a custom template (Apache FreeMarker).
- **User Updates**: When enabled, users are sent to the webhook when an event is sent to Amplitude. Amplitude Identify API calls are also forwarded to the webhook.

Configuration options:

- Custom webhook URL endpoint
- Up to five custom headers for authentication or routing
- Event filtering to select specific event types
- Custom payload templates using Apache FreeMarker

### Cohort Webhooks

Amplitude can send cohort membership data to a webhook endpoint. This allows syncing cohort membership changes (users entering or leaving a cohort) to external systems. Payloads include user identifiers and cohort metadata, and can also be customized with FreeMarker templates.

### Webhooks for Custom Monitors

Custom alerts notify you when your most important KPIs change in meaningful ways. With webhooks for custom monitors, you can use a webhook to send triggered monitors to an endpoint for a number of applications whenever user behavior changes in a way that affects your KPIs.
