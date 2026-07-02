Now let me get more details on the API features by checking the API docs:Now let me get more details on the API resource categories:Now I have enough information to write the specification.

# Slates Specification for LaunchDarkly

## Overview

LaunchDarkly is a feature management platform that allows teams to control feature flags, run experiments, manage rollouts, and target specific user segments. It provides a REST API (base URL: `https://app.launchdarkly.com/api/v2`) that covers all functionality available in the LaunchDarkly UI, including managing flags, projects, environments, contexts, segments, experiments, and account members.

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

### OAuth 2.0

You can connect your LaunchDarkly account to external applications using the OAuth 2.0 protocol. The OAuth2 client API allows you to register a LaunchDarkly OAuth client for use in your own custom integrations. Registering a LaunchDarkly OAuth client allows you to use LaunchDarkly as an identity provider so that account members can log into your application with their LaunchDarkly account.

To use OAuth 2.0, you must register an OAuth client via the API or by contacting LaunchDarkly, providing a client name, redirect URI, and description. This API acknowledges creation of your client with a response containing a unique `_clientSecret`. If you lose your client secret, you will have to register a new client.

OAuth apps inherit the permissions of the authorizing account member and can never exceed them.

## Features

### Feature Flag Management

Create, update, toggle, and delete feature flags across projects and environments. Flags support multiple variation types (boolean, string, number, JSON), targeting rules, percentage rollouts, and prerequisites. A project can contain multiple environments, and feature flags exist across all environments within a project. When you create a new flag, it is created in every environment in your LaunchDarkly project. However, the changes you make to a flag in one environment do not apply to the same flag in any other environment.

- Supports progressive rollouts and guarded rollouts for safe releases.
- Flag triggers allow external services to toggle flags via webhook URLs.
- Scheduled changes allow planning flag changes for a future time.
- Flag links let you associate flags with external resources (e.g., Jira tickets).

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

- Create and manage experiments tied to feature flag variations.
- Define metrics (conversion, numeric, funnel) to measure experiment outcomes.
- Supports multi-armed bandits and holdout groups.
- Warehouse-native experimentation with Snowflake is also available.

### Metrics

Define custom metrics that track events in your application. Metrics can be used in experiments to measure the impact of flag variations. Supports metric groups for organizing related metrics together.

### Account and Team Management

Manage account members. For example, you can invite new members or find account members in a particular role. Create and manage teams, assign custom roles, and control access to resources through role-based policies.

### Change History (Audit Log)

LaunchDarkly keeps a running log of changes made to feature flags and other resources in each environment. Query audit log entries by date range, resource specifier, or full-text search. Useful for compliance and tracking who changed what and when.

### Release Pipelines

Manage releases across environments using release pipelines. Supports release policies and workflows that define the process for promoting flag changes through environments.

### Relay Proxy Configuration

Manage Relay Proxy configurations through the API. The Relay Proxy acts as a proxy between LaunchDarkly SDKs and LaunchDarkly's servers, useful for firewalled environments or to reduce outbound connections.

### Data Export Destinations

Configure destinations for exporting flag evaluation event data to external services and data warehouses.

### Integrations and Integration Audit Log Subscriptions

Configure integrations with third-party services. Audit log subscriptions allow you to forward change history events to external services like Datadog, Slack, and others using configurable policies.

### Workflows and Workflow Templates

Define multi-step workflows for flag changes, such as requiring approval before enabling a flag in production. Workflow templates allow reusing common patterns.

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

### Integration Audit Log Subscriptions

A more structured alternative to raw webhooks, audit log subscriptions let you forward change history events to supported third-party integrations (e.g., Datadog, Slack, Microsoft Teams, Splunk). These support the same policy-based filtering as webhooks but use pre-built templates to format the payload for each integration.
