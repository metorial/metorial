Now let me look at the actual API reference to understand the full set of features:Now I have a good understanding of Hightouch's API. Let me check if there are any webhook/event listening capabilities:I now have enough information to write the specification. Note that:

- Hightouch's docs.hightouch.ai is a different product (a chatbot platform), not the same as hightouch.com
- Hightouch (hightouch.com) is a data activation / reverse ETL platform
- The REST API uses Bearer token auth with API keys
- The API base URL is `https://api.hightouch.com/api/v1`
- No outgoing webhooks/event subscriptions from Hightouch's management API (alerting is via Slack/email/SMS/PagerDuty but not API webhooks)

# Slates Specification for Hightouch

## Overview

Hightouch is a data activation (reverse ETL) platform that syncs data from data warehouses and databases to 200+ SaaS destinations such as CRMs, ad platforms, and marketing tools. It provides a REST API for programmatically managing workspace resources including sources, destinations, models, and syncs.

## Authentication

Hightouch uses **API key-based authentication** via Bearer tokens.

- **Method:** HTTP Bearer Token
- **Header:** `Authorization: Bearer <API_KEY>`
- **Base URL:** `https://api.hightouch.com/api/v1`

To obtain an API key:

1. Log in to Hightouch as an Admin user of your workspace.
2. From the API keys tab on the Settings page, select "Add API key."
3. Copy your API key and store it in a safe location. The key will only be displayed once.

To use Hightouch programmatically through the API, you must use an API key created by an Admin user of your Hightouch workspace. Your API key provides read/write access to sensitive Hightouch resources and should be kept secure.

There are no OAuth flows or scopes for the management API. The API key grants full workspace-level access.

## Features

### Source Management

Create, retrieve, list, and update data sources connected to your Hightouch workspace. Sources are where your organization's data lives — these define the data warehouses, databases, or other systems from which Hightouch pulls data.

### Destination Management

Create, retrieve, list, and update destinations in your workspace. A destination is any tool or service you want to send source data to, such as CRM systems, ad platforms, marketing automations, and support tools. Hightouch integrates with 200+ destinations.

### Model Management

Create, retrieve, list, and update models that define which data to pull from sources. Models define the data you want to pull from a source. You can also use Hightouch's no-code Customer Studio feature to define cohorts before syncing data to a destination. Models require a unique primary key for change data capture.

### Sync Management

Create, retrieve, list, and update syncs that move data from models to destinations. Syncs declare how you want query results from a model to appear in your destination. Syncs can be configured with various modes (upsert, insert, update, mirror) and field mappings between source columns and destination fields.

### Sync Triggering

Programmatically trigger syncs to run on demand, either by sync ID or slug. You can also trigger sync sequences (ordered groups of syncs). This is useful for integrating Hightouch into existing data pipelines and orchestration workflows. You can also trigger syncs using Airflow, Dagster, Prefect, Mage, or the REST API.

- Supports triggering individual syncs or sync sequences.
- Can optionally perform a full resync instead of incremental.

### Sync Run Monitoring

List and inspect sync run history for a given sync, including status (completed, failed, aborted), row counts for added/changed/removed records, and error details. Also supports checking the status of sync sequence runs.

### Personalization API

Hightouch Personalization API is a fully managed service that combines the analytical power of the data warehouse with the real-time performance of a low-latency API. You can serve any data model — customers, products, transactions, recommendations, etc. — to any internal app, web experience, or email marketing platform.

- Records are queried by collection name and index key/value.
- You can specify your API key via a bearer token in an HTTP Authorization header.
- Available only to Business Tier customers.

## Events

The provider does not support webhooks or event subscription mechanisms through its API. Hightouch offers alerting for sync monitoring through SMS, Slack, email, and PagerDuty, but these are notification channels configured in the UI, not programmable webhook subscriptions available via the API.
