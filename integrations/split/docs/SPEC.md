Now I have enough information to write the specification.

# Slates Specification for Split

## Overview

Split (now part of Harness as Feature Management & Experimentation / FME) is a feature flag and experimentation platform that enables teams to manage feature rollouts, run A/B experiments, and measure the impact of features on metrics. It provides an Admin API for programmatically managing feature flags, segments, environments, users, and related resources.

## Authentication

Split API supports authentication via API keys, personal access tokens (PATs), or service account tokens (SATs).

**Admin API Keys (Legacy Split)**

FME SDKs and Admin API both require API keys for authentication. There are three types: Server-side keys (for backend SDKs), Client-side keys (for frontend/mobile SDKs), and Admin keys (for Admin API endpoints).

Authentication is done via Bearer token in the `Authorization` header:

```
Authorization: Bearer <ADMIN_API_KEY>
```

The base URL for the Admin API is `https://api.split.io/internal/api/v2/`.

Split enables restricting API key access in two ways: specifying roles for the API key (limiting which resource types it can access) and specifying a scope (limiting reach across environments, a project, or the whole account).

Available roles include `API_ALL_GRANTED` (full access), `API_ADMIN`, `API_APIKEY`, and resource-specific roles. If no role is specified, by default the `API_ALL_GRANTED` role is assigned.

**Harness Mode (Migrated Accounts)**

Harness mode requires a `harness_token` (Harness API key). Split API keys are not supported in harness mode. If your account has been migrated to Harness, you should create a new Harness API key. The Harness API key is passed via the `x-api-key` header, and Harness-specific endpoints use the base URL `https://app.harness.io/`.

## Features

### Feature Flag Management

Create, update, kill, restore, and delete feature flags programmatically. Feature flags can have multiple treatments (variants) with targeting rules, percentage-based rollouts, and individual targeting. Flag definitions can be partially updated using JSON Patch operations (replace, add, remove) targeting specific parts of the flag definition. Flags can be managed per environment and assigned rollout statuses to track lifecycle stages.

### Flag Sets

Organize feature flags into logical groupings called flag sets. Flag sets can be created, listed, retrieved, and deleted.

### Segments

Create and manage segments of users for targeting purposes. The Identities REST API lets you identify your keys in Split, making them available when writing targeting rules and enriching autocomplete functionality throughout the UI. Segments support bulk key upload via CSV or JSON. Split supports standard segments, large segments (for high-cardinality use cases), and rule-based segments (dynamic membership based on attribute conditions).

### Environments

Manage deployment environments (e.g., staging, production). Feature flag definitions are scoped per environment, allowing different configurations across environments.

### Events and Metrics

To power analytics and experimentation, you can send events to Split, enabling measurement of the impact of features on customer behavior, user experience, or application performance. Events can be sent via the Events API with a traffic type, event type name, optional value, and custom properties. Event properties are exposed in the metric definition builder for creating granular and flexible metrics, and can be used as filters or measured values.

### User and Group Management

Invite, list, update, and remove users from your Split organization. Create and manage groups to organize users and assign permissions. Users can be added to or removed from groups programmatically.

### Projects (Workspaces)

Create and manage projects (formerly called workspaces) to organize feature flags, segments, and environments into logical groupings within your account.

### Traffic Types

Manage traffic types which define the kind of entities (e.g., users, accounts) that feature flags target. Traffic types are associated with projects and determine how identities and attributes are organized.

### Change Requests

Submit, list, and manage change requests for feature flag modifications. This supports approval workflows where flag changes require review before being applied.

### Attributes and Identities

Manage attributes associated with traffic types to enrich targeting capabilities. Upload identity data to pre-populate the UI for targeting rules and autocomplete. Attributes can be uploaded individually or in bulk via CSV/JSON.

### Tags and Restrictions

Associate tags with feature flags for organizational purposes. Manage restrictions to control access to specific resources.

## Events

Split supports four outgoing webhook types that send HTTP POST payloads to configured URLs:

### Audit Log Webhook

Integrates feature flag changes into external tools. Anytime a feature flag is modified, Split sends an HTTP POST payload to the webhook's configured URL. The payload includes the feature flag name, change description, environment name, timestamp, and the updated definition. Can be scoped to specific environments within a project.

### Admin Audit Log Webhook

Integrates admin-level changes into external tools to ensure all configuration changes are logged for audit purposes. Anytime a project, environment, API key, traffic type, user, group, security setting, general setting, experiment setting, or integration is modified, Split sends an HTTP POST payload to the configured URL.

### Impressions Webhook

Sends impression data (feature flag evaluations served to users) to an external endpoint. Impressions are sent in batches approximately every 10 seconds and include the evaluated key, feature flag name, treatment served, environment, timestamp, SDK info, and the targeting rule that was applied. Can be scoped to specific environments within a project.

### Metric Alerts Webhook

Sends metric alert and significance events to a configured endpoint. This enables teams to receive notifications when metric thresholds are crossed or when experiment results reach statistical significance.
