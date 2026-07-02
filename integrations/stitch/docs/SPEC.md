Now I have a good understanding of Stitch (the ETL/data pipeline platform by Stitch Data). Let me also check the Connect API's notification/webhook management and extraction/load monitoring features more closely.

# Slates Specification for Stitch

## Overview

Stitch (by Talend) is a cloud-based ETL (Extract, Transform, Load) service that replicates data from SaaS applications, databases, and other sources into data warehouses such as Amazon Redshift, Google BigQuery, Snowflake, and PostgreSQL. It offers two APIs: the Connect API for programmatic account and pipeline management, and the Import API for pushing arbitrary data into a destination.

## Authentication

Stitch uses **Bearer Token authentication** for both its APIs.

### Connect API (Account & Pipeline Management)

API requests are authenticated by providing an access token in the `Authorization` header. Each access token is associated with a single Stitch client account. Access tokens do not expire, but they may be revoked by the user at any time.

All requests must be made over HTTPS. There are two ways to obtain an access token:

1. **Individual Stitch Users:** Users who want to programmatically control their own Stitch client account can create, revoke, and delete API access tokens on the Account Settings page of their Stitch client account. Access to the API is available during the Free Trial or as part of an Advanced or Premium plan.

2. **Stitch Partners (OAuth):** Partners performing actions in Stitch client accounts on behalf of users who authorize their API client need to register as an API client and follow the Partner API Authentication guide. Partners can either:
   - Create a new Stitch client account using the API, providing `partner_id` and `partner_secret` in the request body, which returns an access token in the response.
   - Use an OAuth flow where the user is sent to Stitch from the partner application using the partner's `partner_id` as the client ID. The user authorizes the application and is redirected back with a token.

**Header format:**

```
Authorization: Bearer [ACCESS_TOKEN]
```

**Base URL:** `https://api.stitchdata.com` (varies by data pipeline region, e.g., `https://api.eu-central-1.stitchdata.com` for EU).

### Import API (Data Push)

The Import API uses an API access token to authenticate requests. Import API access tokens can be generated and managed in the Integration Settings page for any Import API integration in your Stitch account.

For some endpoints, you'll also need to include your Stitch client ID in the request body. Your Stitch client ID is the unique ID associated with your Stitch account. The client ID can be found in the Stitch dashboard URL.

## Features

### Account Management

The Connect API enables users to programmatically access and manage their Stitch accounts, or partners to integrate Stitch's data pipeline functionality into their own platforms. It allows you to programmatically provision Stitch accounts, create and modify data sources, and configure destination connections.

### Source (Integration) Management

Create, update, delete, and list data sources (integrations) that Stitch extracts data from. Every data source available in the Connect API has a type, typically similar to `platform.<source-type>`. Sources go through a multi-step configuration process including form properties, OAuth (if applicable), and field selection. After field selection, the source becomes `fully_configured` and Stitch can begin replication using the schedule and stream/field selection data provided.

### Destination Management

Configure destination objects representing the data warehouses into which Stitch writes data. Only a single destination is supported per Stitch client account. Supported destinations include Amazon Redshift, Google BigQuery, PostgreSQL, Snowflake, and others.

### Stream and Field Selection

Select the streams (tables) and fields (columns) you want to replicate. At least one stream and one field in the stream must be selected to complete field selection. Stream and field metadata can be retrieved and updated to control what data is replicated.

### Replication Scheduling

Configure how often data sources are replicated. Options include frequency-based scheduling (e.g., every 30 or 60 minutes), cron expressions, and anchor times.

### OAuth Configuration for Sources

Configuring OAuth allows you to completely white label the source setup process. Your application handles the OAuth handshake and redirects, provides the required OAuth source properties to the Connect API, and Stitch manages OAuth and refresh tokens on an ongoing basis. Otherwise, Stitch will use its managed credentials to perform the OAuth handshake.

### Extraction and Load Monitoring

Monitor the status of extraction jobs and data loading operations for your sources. This allows tracking of replication progress, identifying failures, and understanding when data was last loaded.

### Data Push (Import API)

The Import API enables you to push arbitrary data from a source to Stitch. The Import API acts as a receiving point for data that is sent to Stitch. This allows you to push data from a source (including those Stitch doesn't currently have an integration for) and send it to Stitch.

- Data is pushed in JSON format using a JSON Schema for validation and typing.
- Stitch supports Upsert and Append-Only loading. Whether key_names specifies Primary Key fields determines the loading behavior. If Primary Keys aren't specified, data will be loaded using Append-Only loading.
- Each record requires a sequence property to ensure correct ordering of updates.

### Incoming Webhooks

Stitch's Incoming Webhooks integration provides a simple and flexible method to integrate dozens of webhook APIs with Stitch. If Stitch doesn't have a native integration for the webhook you want to integrate, then Stitch webhooks is your best bet.

- The data sent by the webhook API must come to Stitch in JSON format, and the payload must come via a POST request.

### Notification Management

Create, list, update, and delete custom email notifications and post-load webhook notifications via the Connect API. You can configure up to 10 post-load hooks.

## Events

Stitch supports **post-load webhook notifications** that fire when data loading completes.

### Post-Load Hooks

Post-load hooks allow you to configure a webhook that fires each time data is loaded into your existing destination. Using post-load hooks, you can extend Stitch and automate dependent processes. For example: Trigger downstream processing in SQL, an Amazon Web Services Lambda function, Talend Cloud jobs, or any other system that can be controlled with an HTTP request.

- Post-load hooks are sent on a per-integration, per-table basis to each configured post-load webhook URL.
- If multiple tables are set to replicate for an integration, Stitch will send a request for each table every time data is successfully loaded or rejected.
- If the load for a table fails, a post-load webhook will not be sent.
- The webhook payload includes metadata such as integration name, table name, number of rows loaded/rejected, primary keys, and bookmark metadata.
- You can configure up to 10 post-load hooks.
- Post-load hooks can be managed both through the Stitch UI and the Connect API.
