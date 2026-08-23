# LaunchDarkly integration specification

## Overview

This integration manages feature flags, projects, environments, segments, and account invitations. It can inspect credentials, contexts, members, metrics, experiments, and audit entries, and can receive signed change notifications. It calls LaunchDarkly REST API version `20240415` and supports commercial, EU, and US federal API hosts.

## Authentication

LaunchDarkly supports two authentication methods for its REST API:

### API Access Tokens (Primary Method)

The preferred way to authenticate with the API is by adding an `Authorization` header containing your access token to your requests. The value of the `Authorization` header must be your access token.

There are two types of access tokens:

- **Personal access tokens**: Use a personal token when you want to access the LaunchDarkly API for your temporary or personal use. You can configure a personal access token to have the same permissions that you do, or more restrictive permissions. Your personal tokens can never do more than you can in LaunchDarkly.

- **Service tokens**: Unlike personal tokens, service tokens are not tied to your LaunchDarkly profile. You can assign an existing role to a service token, or create a custom role for it to use, but you can never give a service token more permissions than you have. A service token's permissions are permanently fixed after you create it. You cannot edit the permissions of a service token. Use a service token to create long-term integrations with the LaunchDarkly API. This feature is only available to customers on Enterprise plans.

In LaunchDarkly, you can create access tokens in the Organization settings, from the Authorization page.

Tokens can be scoped using built-in roles (Reader, Writer, Admin) or custom roles with inline policies to restrict access to specific resources, projects, or environments.

Example header:

```
Authorization: api-12345abcde
```

## Features

### Feature Flag Management

Create, update, toggle, and delete feature flags across projects and environments. Flags support multiple variation types (boolean, string, number, JSON), targeting rules, percentage rollouts, and prerequisites. A project can contain multiple environments, and feature flags exist across all environments within a project. When you create a new flag, it is created in every environment in your LaunchDarkly project. However, the changes you make to a flag in one environment do not apply to the same flag in any other environment.

Semantic patch updates expose LaunchDarkly's targeting, rollout, prerequisite, variation, and flag-metadata instructions. The dedicated toggle tool covers the common on/off operation.

### Segments

Segments are groups of contexts that you can use to manage flag targeting behavior in bulk. LaunchDarkly supports rule-based segments, which let you target groups of contexts individually or by attribute, list-based segments, which let you target individual contexts or uploaded lists of contexts, and synced segments, which let you target groups of contexts backed by an external data store.

- Segments can be shared across multiple feature flags within an environment.

### Contexts

Contexts are people, services, machines, or other resources that encounter feature flags in your product. Contexts are identified by their kind, which describes the type of resources encountering flags, and by their key. Each unique combination of one or more contexts that have encountered a feature flag in your product is called a context instance.

- Search and filter contexts by attributes, kind, and activity date.
- Contexts are scoped to a specific project and environment.

### Projects and Environments

Create and manage projects and environments. Each project can contain multiple environments (e.g., development, staging, production), each with its own set of flag configurations, SDK keys, and context data.

### Experimentation

Experimentation lets you validate the impact of features you roll out to your app or infrastructure. You can measure things like page views, clicks, load time, infrastructure costs, and more.

The integration lists experiments and their current iteration details. Experiment creation and mutation are not exposed.

### Metrics

List custom metrics used by experiments, including their type, active state, numeric settings, tags, and creation date. Metric creation and mutation are not exposed.

### Account and Team Management

List account members and invite new members with built-in roles, custom roles, or role attributes. Team and role administration are not exposed.

### Change History (Audit Log)

LaunchDarkly keeps a running log of changes made to feature flags and other resources in each environment. Query audit log entries by date range, resource specifier, or full-text search. Useful for compliance and tracking who changed what and when.

## Events

LaunchDarkly supports webhooks that notify external services when changes occur.

### Webhooks

LaunchDarkly's webhooks allow you to build your own integrations that subscribe to changes in LaunchDarkly. When something changes, like when a feature flag is updated, or when an account member is invited to LaunchDarkly, LaunchDarkly sends an HTTP POST payload to the webhook's configured URL.

- LaunchDarkly sends all flag change events in the production environment to a webhook by default. To customize the events LaunchDarkly sends to a webhook, use the policy editor in the webhook creation panel.
- Policies use resource specifiers to filter events by project, environment, resource type (flags, segments, projects, members, etc.), and action.
- The webhook payload is identical to an audit log entry.
- Webhooks can be signed with a shared secret (auto-generated or user-supplied) for verification.
- If LaunchDarkly receives a non-2xx response to a webhook POST, it will retry the delivery one time. Webhook delivery is not guaranteed. If you build an integration on webhooks, make sure it is tolerant of delivery failures.
- Webhooks may not be delivered in chronological order. We recommend using the payload's "date" field as a timestamp to reorder webhooks as they are received.

The resource-change trigger registers a signed webhook and verifies LaunchDarkly's `X-LD-Signature` header. The flag-change trigger polls the audit log. Both parse canonical string resource specifiers to expose project, environment, flag, segment, or member identifiers.

## Official API references

- [LaunchDarkly REST API overview](https://launchdarkly.com/docs/api)
- [API version migration guide](https://launchdarkly.com/docs/guides/api/api-migration-guide)
- [Feature flags](https://launchdarkly.com/docs/api/feature-flags)
- [Segments](https://launchdarkly.com/docs/api/segments)
- [Caller identity](https://launchdarkly.com/docs/api/other/get-caller-identity)
- [Webhooks](https://launchdarkly.com/docs/api/webhooks)
