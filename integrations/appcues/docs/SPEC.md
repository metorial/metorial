# Slates Specification for Appcues

## Overview

Appcues is a product adoption platform that enables companies to build in-app experiences such as onboarding flows, tooltips, checklists, banners, NPS surveys, and announcements—without writing code. It supports both web and mobile applications and provides APIs for managing experiences, user data, and event tracking programmatically.

## Authentication

All requests to the Appcues API V2 must be authenticated using an API key and secret via HTTP Basic Auth. The key and secret are joined with a colon (`API_KEY:API_SECRET`), Base64-encoded, and passed in the `Authorization` header as `Authorization: Basic <encoded_value>`.

API keys and secrets can be created by Account Admins at `https://studio.appcues.com/settings/keys`. When creating a key, you assign it a friendly name and a permission level. The secret is only shown once at creation time and cannot be retrieved later.

Most API URLs require an Appcues Account ID as part of the URL path. You can find your account ID on your Studio account page at `https://studio.appcues.com/account`.

The API is available in two regions:

- **US Region**: `https://api.appcues.com` — for accounts hosted in the United States.
- **EU Region**: `https://api.eu.appcues.com` — for accounts hosted in the European Union.

**Required credentials:**

- API Key
- API Secret
- Account ID

## Features

### Experience Management (Flows, Pins, Banners, Launchpads, Checklists, Mobile Experiences)

Retrieve details and listings of all experience types created in your Appcues account, including web flows, pins (persistent tooltips), banners, launchpads, checklists, and mobile experiences. You can also publish or unpublish each experience type programmatically.

- Each experience type supports list, get details, publish, and unpublish operations.
- Flows include metadata such as name, publish status, frequency setting (e.g., `once`, `every_time`), and associated tags.

### User Profile Management

Read, update, and delete end-user profiles. Profile properties are used for targeting and personalization of Appcues experiences.

- Updates are applied synchronously and immediately available for flow targeting.
- Deleting a user profile resets their experience state (e.g., re-enables one-time flows, resets checklist progress) but does not remove analytics data.

### User Event Tracking

Track custom events for individual users and retrieve a user's recent event history.

- Events require a name, timestamp, and optional attributes.
- Events are immediately available for flow targeting but take several minutes to appear in analytics/insights.

### Group Management

Read and update group (account/company) profiles, and associate users with groups.

- Group properties can be used for targeting experiences at the group level.

### Segment Management

Create, update, delete, and list user segments. Add or remove user IDs from segments in bulk.

- Segments can be populated by uploading lists of user IDs via JSON, CSV, or file upload.
- Segment membership changes are processed asynchronously.
- Segment membership can be exported with optional property inclusion.

### Bulk Data Import

Import user profiles, group profiles, and event data in bulk.

- Accepts CSV, Newline-Delimited JSON, or file uploads.
- Imports are processed asynchronously; job status can be tracked via the Jobs API.

### Bulk Data Export

Export event data matching specified conditions and time ranges.

- Supports filtering by flow, checklist, NPS, segment, event name, and custom attributes using a flexible conditions syntax.
- Exported data can be delivered via email or retrieved through the Jobs API.

### Tags

List and retrieve tags used to organize experiences within the account.

### Ingestion Filtering Rules

Configure allow/deny rules to control which user profile attributes, event names, and group attributes are stored by Appcues.

- Rules are global per account and operate in either "allow" or "deny" mode.
- Updating rules overwrites the previous set entirely.

### SDK Authentication Keys

Manage SDK authentication keys used for identity verification. Create, list, update, and delete SDK keys, and enable or disable enforcement mode and secure data ingest.

- There is a limit of 5 SDK keys per account.

### Screenshots

Download screenshots of draft flows and experiences as a ZIP file.

## Events

Appcues supports outbound webhooks that push event data in real-time to a configured endpoint URL. You can subscribe to one or more core Appcues events and send information about that event to a different tool of your choice as soon as it occurs. Webhooks are created and managed by Admins in Appcues Studio under Settings > Integrations > Webhooks.

Webhooks can be configured to fire on all occurrences of selected event types, or filtered to only fire when events occur on specific flows or experiences. Webhook payloads can be secured using an account secret key, which generates `X-Apc-Signature` (HMAC SHA256) and `X-Apc-Timestamp` headers for verification.

### Experience Events

Events related to user interactions with in-app experiences:

- **NPS Events**: NPS Score, NPS Feedback, NPS Started — triggered when users interact with NPS surveys.
- **Web Flow Events**: Web Flow Started, Web Flow Completed, Web Flow Skipped, Web Flow Button Clicked, Web Flow Form Submitted — triggered during user interaction with web flows.
- **Checklist Events**: Checklist Shown, Checklist Item Completed, Checklist Completed, Checklist Skipped — triggered during checklist interactions.
- **Banner Events**: Banner Dismissed — triggered when a user dismisses a banner.
- **Mobile Flow Events**: Mobile Flow Started — triggered when a mobile flow begins.
- **Pin Events**: Pin Interacted — triggered when a user interacts with a pin.

### Workflow Events

Events related to out-of-product communication workflows:

- **Email Events**: Email Attempted, Email Delivered, Email Bounced, Email Soft Bounced, Email Opened, Email Clicked, Email Failed, Email Skipped, Email Marked Spam, Email Unsubscribed.
- **Push Notification Events**: Push Sent, Push Opened, Push Failed, Push Skipped.
- **Workflow Lifecycle Events**: Workflow Entered, Workflow Exited, Workflow Task Started, Workflow Task Completed, Device Unregistered.
