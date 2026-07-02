# Slates Specification for Kibana

## Overview

Kibana is the visualization and management frontend for the Elastic Stack (Elasticsearch, Logstash, Beats). It provides a REST API for programmatically managing resources such as saved objects (dashboards, visualizations, data views), alerting rules, connectors, spaces, cases, SLOs, and Fleet agent policies. The Kibana REST APIs enable you to manage resources such as connectors, data views, and saved objects.

## Authentication

Kibana supports two primary authentication methods for API access:

### Basic Authentication (Username/Password)

The Kibana APIs support key- and token-based authentication. To use token-based authentication, you use the same username and password that you use to log into Elastic. Send credentials via the standard HTTP `Authorization: Basic <base64(username:password)>` header.

### API Key Authentication

These APIs use key-based authentication. You must create an API key and use the encoded value in the request header. API keys can be created via the Kibana UI (Stack Management > API Keys) or via the Elasticsearch API. Pass the key using the `Authorization: ApiKey <encoded_key>` header.

### Required Headers

For all APIs, you must use a request header. The Kibana APIs support the kbn-xsrf and Content-Type headers. The `kbn-xsrf` header (any value, e.g., `true`) is required on all mutating requests (POST, PUT, DELETE, PATCH) to prevent CSRF attacks.

### Spaces

To run APIs in non-default spaces, you must add s/{space_id}/ to the path. All API calls are scoped to a Kibana space. The base URL for non-default spaces is `https://<kibana-host>/s/<space_id>/api/...`. The default space does not require a space prefix.

## Features

### Saved Objects Management

Export sets of saved objects that you want to import into Kibana, resolve import errors, and rotate an encryption key for encrypted saved objects with the saved objects APIs. These objects include dashboards, visualizations, maps, data views, Canvas workpads, and other saved objects.

- Import/export saved objects in NDJSON format for migration between environments.
- Copy or share saved objects between spaces.
- Saved objects are not backwards-compatible across Kibana versions.

### Data Views (Index Patterns)

Create, read, update, and delete data views that define which Elasticsearch indices Kibana queries. An index pattern identifies one or more Elasticsearch indices that you want to explore with Kibana. Kibana looks for index names that match the specified pattern. Supports runtime fields and field formatting configuration.

### Spaces

Spaces enable you to organize your dashboards and other saved objects into meaningful categories. You can use the default space or create your own spaces.

- Create, update, delete, and list spaces.
- Copy and share saved objects between spaces.
- Rules and connectors are isolated to the Kibana space in which they were created. A rule or connector created in one space will not be visible in another.

### Alerting (Rules)

When a condition is met, the rule tracks it as an alert and runs the actions that are defined in the rule. Actions typically involve the use of connectors to interact with Kibana services or third party integrations.

- Create, update, delete, enable/disable, mute/unmute, and snooze alerting rules.
- Rule types include Elasticsearch query, index threshold, metric threshold, log threshold, and more.
- Configure action frequency (on every check, on status change, or throttled intervals).
- Rules are authorized using API keys scoped to the creating user's privileges.

### Connectors (Actions)

Manage connectors that integrate with external services for rule-triggered notifications. Supported connector types include email, Slack, PagerDuty, webhook, Jira, ServiceNow, Microsoft Teams, Opsgenie, and more.

- Create, update, delete, and test connectors.
- The Webhook connector uses axios to send a request to a web service. Webhook connectors support basic auth, OAuth 2.0, and SSL authentication.

### Cases

Create and manage cases for incident tracking. Cases can be associated with alerts, have comments and attachments (including files), and can be synced with external case management systems via connectors.

### SLOs (Service Level Objectives)

You must have all privileges for the SLOs feature in the Observability section of the Kibana feature privileges.

- Create, update, delete, and retrieve SLO definitions.
- Supports multiple indicator types (KQL, metric custom, histogram) and budgeting methods (occurrences or timeslices).
- Group SLOs by field values to create per-group objectives.

### Fleet Management

Manage Elastic Agents and their policies programmatically.

- Create and manage agent policies and integration (package) policies.
- To get a list of valid enrollment tokens from Fleet, call GET /api/fleet/enrollment_api_keys.
- Enroll, unenroll, and upgrade agents; manage tags and assign policies.

### Machine Learning

Elasticsearch API user: uses an Elasticsearch client, cURL, or Kibana Dev Tools to access machine learning features via Elasticsearch APIs. Kibana provides APIs for synchronizing ML saved objects and managing ML job assignments to spaces. Anomaly detection job and data frame analytics management is primarily via Elasticsearch APIs.

### Security (Roles and User Sessions)

Manage role-based access control including Kibana feature privileges. Create and manage roles with specific space-level feature access. Invalidate user sessions.

### Detection Rules (Elastic Security)

Create and manage security detection rules for SIEM use cases. Supports various rule types including query-based, threshold, EQL, indicator match, and machine learning rules. Configure automated actions/notifications when detections fire.

## Events

The provider does not support webhooks or event subscription mechanisms for external consumers. Kibana can _send_ outbound webhook notifications as actions triggered by alerting rules, but it does not expose an API for subscribing to or receiving inbound event callbacks about changes within Kibana itself.
