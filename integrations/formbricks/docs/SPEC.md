# Slates Specification for Formbricks

## Overview

Formbricks is an open-source experience management and survey platform. It allows users to create and distribute surveys across websites, apps, email, and links, and collect responses with user targeting and segmentation. It can be self-hosted or used via its cloud offering.

## Authentication

Formbricks provides two APIs: the Public Client API and the Management API. Each API serves a different purpose and has different authentication requirements.

**Public Client API:**
The Public Client API does not require authentication. It is designed for client-side interactions and does not expose sensitive information. It requires only an `environmentId` to identify the Formbricks project environment.

**Management API (primary integration API):**
The Management API provides access to all data and settings that your account has access to in the Formbricks app. It requires a personal API Key for authentication, which can be generated in the Settings section of the Formbricks app.

- The API key is passed via the `x-api-key` header.
- The API key gives you the same rights as if you were logged in at formbricks.com.
- You create a key for the development or production environment. Copy the key immediately — you won't be able to see it again.
- Base URL for the cloud-hosted version: `https://app.formbricks.com/api/v1/` (v1) or `https://app.formbricks.com/api/v2/` (v2 beta). Self-hosted instances use their own domain.

Example authentication header:

```
x-api-key: <your-api-key>
```

## Features

### Survey Management

The Management API supports creating and managing surveys. You can list, create, update, and delete surveys programmatically. The platform allows for flexible survey management: adding different question types, setting up validation and restrictions for respondents, using hidden fields, or distributing them via single-use links.

### Response Management

The API supports handling responses. You can list responses for a survey, create responses, update existing responses, and delete responses. Responses include metadata such as user agent, country, source URL, and time-to-completion per question.

### Contact & People Management

You can list and manage contacts (people) who have interacted with your surveys. You can retrieve a contact's state including their segments, displays, responses and other tracking information. If the contact doesn't exist, it will be created. The API also supports bulk uploading contacts and managing contact attribute keys.

### Contact Segmentation & Survey Links

You can generate personalized survey links for contacts in a segment. This enables targeted survey distribution to specific user cohorts. Generated links can have configurable expiration periods.

### Action Classes

You can create, list, and delete action classes. Actions represent user behaviors (e.g., page visits, button clicks) that can serve as triggers to display surveys to users.

### Attribute Classes

You can create, list, and delete attribute classes. Attributes define custom properties on contacts/people used for segmentation and targeting.

### File Storage

The API supports uploading public files, which can be used within surveys or other platform features.

### Account Information

You can retrieve information about the authenticated account, including project details and environment type via the `/me` endpoint.

## Events

Formbricks supports webhooks that deliver real-time HTTP notifications when specific objects change in your environment, allowing you to trigger automated actions based on these events.

Webhooks can be created and managed both through the Formbricks UI and via the Management API. Formbricks implements the Standard Webhooks specification with HMAC signature verification for security.

### Response Events

Formbricks provides the following webhook events: `responseCreated`, `responseUpdated`, and `responseFinished`.

- **responseCreated** — Fires when a new response is started for a survey (may be partial/incomplete).
- **responseUpdated** — Fires when an existing response is updated (e.g., additional questions answered).
- **responseFinished** — Fires when a response is fully completed.

Each webhook can be scoped to specific surveys, so you only receive events for surveys you care about. The webhook payload includes the full response data, survey metadata, contact information, and the event type.
