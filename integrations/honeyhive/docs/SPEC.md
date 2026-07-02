The search results for webhooks were about different products (TheHive, Hive, Honeycomb), not HoneyHive. Let me look at HoneyHive's API reference and alerts feature more closely.Now I have a good picture of HoneyHive. Let me also check for their alerts feature and any webhook/event support specifically from HoneyHive (not other products).Now I have enough information to write the specification. Based on my research, HoneyHive does not appear to support outbound webhooks or event subscriptions via its API. Its "Alerts" feature seems to be an internal monitoring/notification system (likely Slack/email notifications from the dashboard), not a webhook API. Let me compile the specification.

# Slates Specification for Honeyhive

## Overview

HoneyHive is an AI observability and evaluation platform for tracing, monitoring, and evaluating LLM applications and AI agents. It provides distributed tracing, offline experimentation, online evaluations, prompt management, dataset curation, and annotation queues across the AI development lifecycle. The platform is built on OpenTelemetry and supports Python and TypeScript SDKs as well as a REST API.

## Authentication

HoneyHive uses **Bearer Token authentication** via API keys.

- Obtain an API key from the HoneyHive Account Settings page within the application.
- Include the API key as a Bearer token in the `Authorization` header of all REST API requests:
  ```
  Authorization: Bearer <YOUR_API_KEY>
  ```
- The base API URL for the managed cloud is `https://api.honeyhive.ai`.
- For self-hosted or dedicated deployments, a custom `server_url` is required, available from the Settings page in the HoneyHive app.

There are no OAuth flows or scopes. Authentication is solely API key-based. All API keys are scoped to a workspace/team.

## Features

### Project Management

Create and manage projects, which serve as the top-level organizational unit for all traces, evaluations, datasets, and prompts. Projects group related AI application data together.

### Tracing (Sessions & Events)

Log and manage distributed traces of AI application execution. A trace consists of a root session event and nested child events (model, tool, and chain types). Traces capture inputs, outputs, errors, duration, metadata, user properties, and feedback. Events can be created individually or in batches.

- Sessions represent complete interactions or requests.
- Model events track LLM inference calls.
- Tool events track external API calls, database queries, etc.
- Chain events group multiple steps into composable units.

### Monitoring & Dashboards

Query and analyze production traces with custom charts and filters. Aggregate cost, latency, token usage, and custom quality metrics across traces. Build custom queries to explore data and validate hypotheses about system behavior.

### Evaluations & Experiments

Run offline experiments to evaluate AI application performance against curated datasets. Supports programmatic evaluation via SDK with custom evaluator functions. Compare experiment results across multiple runs to detect regressions.

- Evaluators can be code-based or LLM-as-a-judge.
- Experiments can use local datasets or server-managed datasets referenced by ID.
- Online evaluations can run against live production traces.

### Datasets

Create, manage, and version datasets for use in experiments and evaluations. Datasets consist of input/output pairs with optional ground truths. They can be uploaded via the UI (JSON, JSONL, CSV) or via the SDK/API. Production traces can be converted into datasets for iterative improvement.

### Prompt Management

Centrally manage and version prompts outside of application code. Prompts can be deployed to specific environments (dev, staging, prod) and fetched dynamically at runtime via the API. Supports YAML export for local use. Domain experts can iterate on prompts independently through the UI.

- Prompts are scoped to projects and environments.
- Configurations can be retrieved by project, environment, and name.

### Annotation Queues

Collect human feedback from domain experts on traces. Turn qualitative insights into labeled datasets for evaluation or fine-tuning.

### Feedback & Metrics

Post user feedback and custom metrics against specific sessions or events. This data can be used for monitoring quality and building evaluation datasets.

### Alerts

Set up alerts to monitor critical failures or metric drift over time. Alerts trigger when quality metrics degrade based on configured conditions.

- Alerts are configured in the HoneyHive dashboard.

### Administration

Manage workspace settings, invite teammates, and configure role-based access control (RBAC). Supports SSO and SAML for enterprise authentication.

## Events

The provider does not support webhooks or event subscriptions through its API. HoneyHive's alerting system is configured through the platform dashboard and delivers notifications internally (e.g., via Slack or email integrations configured in the UI), but it does not expose a webhook registration or event subscription API for external consumers.
