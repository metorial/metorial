Now I have enough information to compose the specification. Let me consolidate what I've learned.

# Slates Specification for Mezmo

## Overview

Mezmo (formerly LogDNA) is an observability platform that ingests, processes, and routes log and telemetry data. It provides two core products: Log Analysis for centralized log management, search, and alerting; and Telemetry Pipeline for routing, transforming, and filtering data across multiple sources and destinations.

## Authentication

Mezmo supports two authentication methods for its API:

### IAM Access Tokens (Recommended)

The API base URL is `https://api.mezmo.com`. Access tokens are used for all APIs except ingestion. Pass the token in the `Authorization` header in the format: `Authorization: Token {accesstoken}`.

Access tokens can be generated from the Mezmo dashboard under **Settings > Organization > API Keys**.

### Service Keys (Deprecated)

Service keys can be used by placing the key in the `servicekey` header of your API call. Usage of the service key auth mechanism has been deprecated in favor of IAM Access Tokens. Service keys can no longer be created, but can still be used for v1 and v2 APIs while the transition takes place.

### Ingestion Key

Ingestion is similar to the other APIs, but instead of `servicekey` you will use `apikey` if you are using the header style authentication. Ingestion keys are separate from service keys and are specifically for sending log data into Mezmo. They can be generated from **Settings > Organization > API Keys**.

### Enterprise Endpoints

When authorizing against enterprise endpoints, they expect an enterprise service key instead of a regular organization service key. Some endpoints might expect both an enterprise service key and a regular organization service key.

## Features

### Log Ingestion

Send log lines to Mezmo programmatically. You can attach custom metadata to log lines via the `meta` field. Logs can be sent with attributes like application name, hostname, log level, and tags. Multiple log lines can be sent in a single request.

### Log Search and Export

Export log lines in JSONL format. Based on your specific plan, the maximum number of logs returned is limited. There are two distinct functionalities: streaming log lines directly from the response as raw text, or specifying an email to receive a download link. Logs can be filtered by query, time range, log level, app, and host.

### Views and Categories Management

The Configuration endpoints are used to create, update, and delete views, alerts, and categories. Views are sets of predefined search queries and filters that help you better interact with your data. They are an essential part of leveraging the Mezmo platform. Categories allow you to organize views into logical groups.

### Alerts Configuration

Create and manage both view-specific alerts and preset alerts. You can change view configuration details, add or remove view-specific alerts, or attach and detach preset alerts. Alerts can be configured to notify via webhook, Slack, PagerDuty, email, and other channels. Alert types include threshold, change, and absence alerts.

### Boards and Dashboards

The Board endpoints are used to create, get, list, and delete boards. Boards allow you to visualize log data with graphs and screens.

### Exclusion Rules

Control what you store by creating exclusion rules. New lines that match an exclusion rule will not be stored and will not count toward your storage quota. Rules can be created, read, updated, and deleted via the API.

### Ingestion Control

The Start/Stop Ingestion API allows users to programmatically manage their data ingestion status. Users can get the current status of their ingestion, suspend their ingestion, and resume their ingestion. To prevent accidental API calls, the suspension of ingestion requires two subsequent API calls.

### Usage Monitoring

The Usage API provides endpoints for retrieving aggregated usage information for applications, hosts and tags during a time period. Usage data is reported at day-level granularity and measured in bytes consumed on disk.

### Archiving Configuration

The Archiving API enables you to programmatically configure your archiving instances via code. Specifically you can set up cold storage buckets to send your logs for long term storage. Only one archiving configuration may exist at any time. Supports destinations like Amazon S3 and IBM Cloud Object Storage.

### Organization and Member Management

Manage organization members, groups, and API keys programmatically. The API includes endpoints for Groups, Keys, Index Rate Alerts, Members, and Enterprise management.

### Telemetry Pipeline Management

You can define Sources, Destinations, and Processors for building telemetry pipelines. Supported pipeline sources include Mezmo Agent, AWS CloudWatch Logs, AWS Kinesis Firehose, AWS S3 via SQS, Azure Event Hub, Datadog Agent, FluentD/FluentBit, HTTP, Kafka, LogStash, OpenTelemetry (Collector, Logs, Metrics, Traces), Prometheus Remote Write, Splunk HEC, Syslog over HTTP, and Webhook (WebSub). Processors allow filtering, transforming, enriching, encrypting, and aggregating data in-stream before routing to destinations.

### Parsing Templates

Manage custom parsing templates for structuring unstructured log data via the API.

## Events

Mezmo supports outbound webhook alerts that can be configured on views. When log lines match the conditions defined in a view's alert configuration, Mezmo sends an HTTP POST request to a specified webhook URL.

### Log Alert Webhooks

From the dashboard, select the view for which you want to set up alerts. On the view name, click the dropdown and select "Attach an alert." Then select view-specific alert and click on Webhooks. Configure the type of alert, conditions, and enter the webhook URL.

- **Trigger types**: Presence (threshold of matching lines), absence (no matching lines for a duration), and change-based alerts.
- **Configurable parameters**: Alert frequency, webhook URL, HTTP method, custom headers, and custom body template with available tokens (level, name, matches, url, query, app, host, lines).
- Alerts can be attached to specific views or created as preset alerts that can be reused across multiple views.

Mezmo does not support a general-purpose webhook subscription API for arbitrary platform events (e.g., configuration changes). Webhook notifications are limited to log-based alert conditions attached to views.
