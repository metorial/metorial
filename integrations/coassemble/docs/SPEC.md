Let me get more details on the API features, especially tracking/webhooks and the legacy API.Now let me check if Coassemble also has a legacy/standard LMS API (separate from the Headless API) and look at the authentication details more closely.Now I have enough information. Let me also quickly check the authentication details — the API documentation shows two different auth schemes: `Bearer` token and `COASSEMBLE-V1-SHA256` format.

# Slates Specification for Coassemble

## Overview

Coassemble is an online training platform that allows organizations to create, deliver, and track e-learning courses. It provides a "Headless" API designed for embedding course creation and viewing experiences into third-party platforms, along with learner progress tracking and identity management capabilities.

## Authentication

Coassemble uses API key-based authentication. To obtain credentials, enable the API in your Coassemble workspace by navigating to the **Add-ons** section of the settings menu and clicking on **API**.

Once you have completed the entry survey and enabled the API, you will be shown your API credentials including your user ID and API key. Store these securely as they will not be shown again. If you lose your API credentials, you can regenerate them at any time from the settings menu.

The API supports two authorization header formats:

1. **Custom scheme**: `Authorization: COASSEMBLE-V1-SHA256 UserId={USER_ID}, UserToken={API_KEY}`
2. **Bearer token**: `Authorization: Bearer YOUR_API_TOKEN`

All requests are made against the base URL: `https://api.coassemble.com/api/v1/headless/`

You will initially be in 'test mode' allowing you to configure your implementation before purchasing and going live.

## Features

### Course Management

Allows listing, retrieving, duplicating, deleting (soft-delete), and restoring courses. Courses can be duplicated, with an option to assign the duplicated course to a new client or user within your environment. Courses can be filtered by user identifier, client identifier, and title.

### Embeddable Course Viewing and Building

Generates signed URLs that can be used to embed the Coassemble interface into your application within an iframe. Two modes are available:

- **View mode**: Embeds the course player for learners. Supports language override and feedback opt-out.
- **Edit mode**: Embeds the course builder for content creators. Supports multiple creation flows: AI-powered generation (`generate`), document conversion (`transform`), presentation conversion (`convert`), and preview-only mode (`preview`). Various options allow toggling features like Google Drive integration, OneDrive integration, Loom, AI features, narrations, translations, and custom theming via primary color.

The edit action is only available to workspaces that have access to Headless course creation.

### AI Course Generation

Allows programmatic generation of courses using AI. You can generate a course programmatically by providing a prompt, target audience, familiarity level, tone, and desired number of screens. Courses are assigned to users via `identifier` and optional `clientIdentifier`.

### Course Publishing and Versioning

Courses can be published and reverted to their published version programmatically. This supports a draft/publish workflow for course content.

### SCORM Export

Courses can be exported as SCORM packages for use in third-party LMS platforms. Supports SCORM versions 1.2 and 2004, with `dynamic` or `static` package types.

### Identity Management (Clients and Users)

Manage client and user identities used for multi-tenant scenarios. Clients represent groups or tenants, while users represent individual learners or creators. Both support arbitrary `metadata` key-value pairs. Users can be listed (optionally filtered by client), updated, and deleted. When deleting a user, courses can be reallocated to another user, deleted, or ignored.

### Learner Progress Tracking

Tracking objects store learner progress. Using the API, you can fetch tracking objects for your courses and learners. Tracking data can be filtered by course ID, user identifier, client identifier, date range, and completion status. Tracking records can also be deleted.

## Events

Coassemble provides **iframe postMessage-based events** (not server-side webhooks) that can be listened to when embedding courses via signed URLs. These are client-side events emitted through the browser's `window.postMessage` API.

### Course Player Events

Events emitted when a learner views an embedded course:

- **Session events**: `ready` — fires when the course player is mounted and ready.
- **Course events**: `start`, `progress`, `feedback`, `completed` — track course lifecycle from start to completion. Progress only increases and does not decrease on backward navigation.
- **Screen events**: `start`, `end`, `complete`, `answer`, `failed`, `retry` — track individual screen interactions. Quiz-specific events (`answer`, `failed`, `retry`) only apply to quiz-type screens.

### Course Builder Events

Events emitted when the course builder is embedded:

- **Course events**: `created`, `updated` — fires when a course is first created or subsequently updated.
- **Navigation events**: `back` — fires when the back button is clicked in the builder.
- **Session events**: `ready`, `error`, `expired` — track builder lifecycle and error states.

Note: Coassemble does not appear to support traditional server-side webhooks through its Headless API. The events described above are purely client-side iframe message events.
