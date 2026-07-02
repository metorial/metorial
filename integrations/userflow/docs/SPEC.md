# Slates Specification for Userflow

## Overview

Userflow is a user onboarding platform that enables teams to build in-app product tours, flows, checklists, surveys, launchers, and resource centers without code. Its REST API allows synchronizing user data with Userflow and tracking events directly from back-end applications.

## Authentication

Userflow uses API key-based authentication. There are two separate types of API keys for two distinct APIs:

### Users API Key

- To access the API, you'll need an API key, which you can obtain by signing into Userflow and navigating to Settings -> API.
- Used for managing users, groups, events, content, and webhook subscriptions.
- Include the key in the `Authorization` header as a Bearer token: `Authorization: Bearer <api-key>`
- All requests default to the latest API version unless you explicitly override it with the `Userflow-Version` header (e.g., `2020-01-03`). It is strongly recommended to specify a version.

### Personal API Key (Accounts API)

- Personal API keys are used for the Accounts API. These keys are tied to your individual member profile and grant access across accounts you belong to based on your roles and permissions. You can view and create personal API keys under My Account -> Personal API Keys.
- Used for managing account settings, team members, and invites.
- Also passed via `Authorization: Bearer <personal-api-key>` header.

All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.

**Base URL:** `https://api.userflow.com`

## Features

### User Management

- Create, update, retrieve, list, and delete users. Creating or updating a user is an upsert operation — if the user does not exist it will be created; if it already exists, given attributes will be merged into the existing user's attributes.
- Users can hold custom attributes in free-form attribute dictionaries. Attributes support operations like `set`, `set_once`, `add` (increment/decrement numbers), and `append` (add to arrays).

### Group (Company) Management

- Groups represent companies/accounts/tenants. You can manage content based on company attributes or events performed by any user in a company.
- Create, update, retrieve, and list groups with custom attributes.
- The API allows creating/updating both groups and memberships through creating/updating a user by including the appropriate groups.
- Membership pruning is available to remove group memberships not included in a request.

### Event Tracking

- Track any kind of user-related event and use those events to segment and personalize flows.
- Events can include custom attributes (e.g., plan name, price).
- Events can also be associated with groups. At least one of `user_id` or `group_id` is required per event.

### Content Management (Read-only)

- Content is a common term for flows, checklists, and launchers.
- Retrieve and list content objects and their versions (draft and published).
- Content is versioned; the actual contents are found in content versions.

### Event Definitions

- List event definitions configured in your account, which describe the types of events tracked (e.g., "Flow Started", "Checklist Task Completed").

### Account Management (Accounts API)

- Manage your Userflow account, including team members, invites, and account settings. Designed for automating team management and account-level operations.
- Retrieve account details, list and remove members, and create/manage invitations with configurable roles and permissions.

### Webhook Subscription Management

- Create webhook subscriptions to be notified when certain events happen. When a user is created or a user event is tracked, Userflow will send a POST request to a URL of your choosing.
- Create, retrieve, list, update, and delete webhook subscriptions via the API.
- Each subscription is configured with a target URL and a list of topics.
- Userflow includes a `Userflow-Signature` header for verifying that webhook notifications are authentic, including a timestamp to mitigate replay attacks.

## Events

Userflow supports webhooks for event subscriptions. Webhook subscriptions are created via the REST API, configured with a URL and a list of topics to subscribe to. You can use `*` to subscribe to all topics.

### User Events

- **user.created** — Triggered when a new user is created in Userflow.
- **user.updated** — Triggered when a user's attributes are updated. Notifications for `user.updated` include `previous_attributes` and `updated_attributes` keys in addition to the full user object.

### Group Events

- **group.created** — Triggered when a new group is created.
- **group.updated** — Triggered when a group's attributes are updated. Also includes `previous_attributes` and `updated_attributes`.

### Tracked Events

- **event.tracked** — Triggered when any event is tracked for a user or group. Can be filtered to specific event names using the format `event.tracked.<event_name>` (e.g., `event.tracked.subscription_activated`).

### Flow Events

- **Flow completed** — Triggered when a flow is completed by a user by reaching a goal step. If the flow has survey questions, the answers will be provided.
- **Flow started** — Triggered when a flow is started for a user.
- **Flow ended/dismissed** — Triggered when a user dismisses a flow or it automatically ends. If the flow has survey questions, the answers are provided.
- **Flow question answered** — Triggered when a user answers a single question in a flow.

### Checklist Events

- **Checklist started** — Triggered when a checklist is started for a user.
- **Checklist task completed** — Triggered when a user completes a checklist task.
- **Checklist completed** — Triggered when a user has completed all tasks in a checklist.
- **Checklist dismissed** — Triggered when a user dismisses a checklist.

### Launcher Events

- **Launcher activated** — Triggered when a user activates (clicks or hovers over) a launcher.
- **Launcher seen** — Triggered when a user sees a launcher.
- **Launcher dismissed** — Triggered when a launcher is dismissed for a user.
