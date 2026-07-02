# Slates Specification for LogDNA

## Overview

LogDNA (now rebranded as Mezmo) is a SaaS log management platform that allows you to ingest, process, route, analyze, and store logs originating from any source, including applications, cloud systems, Kubernetes, and on-premise servers. All logs are accessible in a centralized dashboard with features such as analysis, monitoring, filters, and alerts.

## Authentication

LogDNA uses two types of API keys for authentication:

1. **Ingestion Key (API Key)**: Used for log ingestion. Instead of `servicekey`, you use `apikey` in the header for ingestion API calls. The ingestion key can be found under Settings > Organization > API Keys in the LogDNA dashboard.

2. **Service Key**: Used for the Configuration and management APIs. You pass it as a `servicekey` header, e.g., `-H 'servicekey: YOUR_SERVICE_KEY'`.

Both keys support two authentication methods:

- **Header-based authentication**: Pass the key in the request header as either `apikey` (for ingestion) or `servicekey` (for configuration/management APIs).
- **Basic authentication**: As an alternative, you can use basic authentication by passing the key as the username with no password. Example: `curl https://api.logdna.com/v1/config/view -u INSERT_API_KEY:`

When authorizing against enterprise endpoints, they expect an enterprise service key instead of a regular organization service key. Some endpoints might expect both an enterprise service key and a regular organization service key.

**Note:** The `apikey` auth mechanism has been deprecated in favor of IAM Access Tokens. The base API URL is `https://api.logdna.com`.

## Features

### Log Ingestion

Send log lines to LogDNA programmatically via the REST API. Each log line can include a `meta` field for custom metadata, which can be viewed in that line's context. If inconsistent value types are used across log lines, metadata may not be parsed correctly. Log lines include parameters such as timestamp, message body, app name, log level, environment, hostname, tags, IP, and MAC address.

### Log Export and Search

The Export API is used to export log lines in JSONL format. You can query logs by time range, search terms, hosts, apps, levels, and tags. There are two versions: v1 (single-page results) and v2 (with pagination support for larger result sets).

### Views and Categories Management

The Configuration API endpoints are used to create, update, and delete views, alerts, and categories. Views are saved log queries that can be filtered by apps, hosts, log levels, query strings, and tags. Views can have view-specific alerts attached, which differ from "preset alerts" that are global. Categories allow logical grouping of views.

### Alerts Management

Alerts can be configured at two levels: preset alerts (account-wide) and view-specific alerts. Alerts can be sent via email, webhook, or PagerDuty. Alert configuration includes options for trigger interval, trigger limit, presence/absence operators, and immediate notification toggle.

### Boards (Dashboards)

The Board endpoints are used to create, get, list, and delete boards. Boards are visual dashboards composed of graphs and widgets for monitoring log data.

### Exclusion Rules

Users can programmatically configure exclusion rules to exclude certain logs from being saved by LogDNA's underlying datastore. This helps control costs and reduce noise for debugging.

### Archiving Configuration

The Archiving API enables you to programmatically configure archiving instances to set up cold storage buckets for long-term log storage. Archiving supports third-party storage providers like Amazon S3 or IBM Cloud Object Storage. Only one archiving configuration may exist at a time.

### Ingestion Control

The Start/Stop Ingestion API allows users to programmatically manage their data ingestion status — get current status, suspend ingestion, and resume ingestion. Suspension requires two subsequent API calls to prevent accidental stoppage.

### Usage Reporting

The Usage API provides endpoints for retrieving aggregated usage information for applications, hosts, and tags during a time period, with daily granularity.

## Events

LogDNA supports outbound alert notifications (i.e., LogDNA sends webhooks to external endpoints when alert conditions are met), but does not provide inbound webhook subscriptions or event streams for external consumers to listen to changes in the LogDNA platform itself.

### Alert Webhooks (Outbound)

LogDNA can send webhook notifications when alert conditions on views are triggered. These are configured as part of view-specific or preset alerts.

- **View-based alerts**: Trigger when log lines matching a view's query meet specified conditions (presence or absence of matching logs within a time interval).
- Configurable parameters include: webhook URL, HTTP method, custom headers, body template (supporting template variables like `{{name}}`), trigger interval, trigger limit, and immediate notification option.
- Supports delivery to custom webhook endpoints, PagerDuty, email, and Slack.

The provider does not support inbound webhooks or event subscription mechanisms for listening to platform-level changes (e.g., configuration changes, user activity).
