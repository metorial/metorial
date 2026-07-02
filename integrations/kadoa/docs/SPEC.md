Now let me get the full API reference to understand the webhook events and other API features better.Now I have enough information to write the specification.

# Slates Specification for Kadoa

## Overview

Kadoa is an AI-powered web data extraction platform that automates scraping, transformation, and delivery of structured data from websites, PDFs, and documents. Kadoa automates web scraping at scale with AI, using AI agents to extract, transform, and integrate data from any website. It is built as an API-first platform where everything available on the dashboard is also possible via the API.

## Authentication

Kadoa uses API key authentication for all API endpoints.

All API endpoints are authenticated using an API key. The API key is passed via the `x-api-key` header:

```
"headers": {
    "x-api-key": "tk-your-api-key"
}
```

To obtain an API key:

1. Log in to the Kadoa dashboard
2. Navigate to **Settings > General**
3. Click **Generate API Key**
4. The key starts with `tk-`

API keys are strictly scoped to individual teams and cannot access data from other teams.

For enterprise deployments, the platform supports SAML SSO and SCIM provisioning.

## Features

### Workflow Management

Create and manage data extraction workflows that target one or more URLs. Kadoa enables extraction from any website, with configurable source options including single URLs, multiple URLs, dynamic URL patterns with placeholders, and auto-detect mode where AI analyzes the page structure. Workflows can run once or on a recurring schedule (daily, weekly, etc.). Kadoa automatically detects and suggests data fields, which can be customized by adding, removing, or renaming fields.

### Data Schemas and Templates

Define reusable data structures that can be applied across different websites for consistent extraction. Schemas can have Data Fields (typed data like STRING, NUMBER), Raw Content Fields (HTML/Markdown), or Classification Fields (predefined categories). Templates allow reusing a data schema across many sites for consistent extraction.

### Ad-hoc Extraction

Ad-hoc extractions let you instantly extract data from a single webpage without creating a persistent workflow. Useful for one-off data needs or testing extraction configurations with a given template.

### Web Crawling

Crawl all accessible subpages of a website and convert them into structured JSON or markdown. Start a crawl session with a single URL or multiple URLs from the same domain, with configurable max depth and max pages. All URLs must be from the same domain or subdomain. Crawl status can be monitored and individual page content can be retrieved in markdown or HTML format.

### Data Change Monitoring

Enable monitoring to get alerts when Kadoa notices changes in the data. Configure monitoring for a workflow to detect data changes. This supports real-time tracking of web sources, useful for detecting regulatory changes, pricing updates, or market-moving events.

### Data Validation

Kadoa allows you to manage data quality by setting data quality rules or managing AI-suggested rules. Validation rules can be generated and added to a workflow. Results of validation can be retrieved per workflow run.

### Data Delivery and Integrations

Push data directly to S3, Snowflake, or spreadsheets. Data can also be exported in CSV or JSON format. Notification channels include Slack, email, Google Sheets, and webhooks.

### Advanced Workflows (Enterprise)

Advanced workflows offer record-and-replay capabilities for capturing webpage interactions, and action sequences for applying formatting, segmentation, and other data processing steps to extracted data. This feature is available on the Enterprise plan.

### Workspace and Team Management

API keys are scoped to individual teams with database-level row security. Workspaces allow organizing workflows and managing access across team members.

## Events

Kadoa supports webhooks for receiving event notifications. You can subscribe to webhook events, list subscriptions, and unsubscribe via the API. Subscriptions are configured with a target URL and HTTP method.

### Workflow Completion Events

Events are emitted when a Kadoa workflow finishes. Useful for triggering downstream processing when new data is available.

### Data Change Events

Notifications for relevant data changes detected by the monitoring system. When a monitored workflow detects changes in the source data, webhook events are fired.

### Notification Events

Notification settings can be created linking channels to specific event types. Supported notification event types can be retrieved via the API. Kadoa also supports WebSocket connections as an alternative real-time delivery mechanism.
