# Metabase Integration Specification

## Overview

Metabase is an open-source business intelligence and analytics platform. You can use Metabase to ask questions about your data, or embed Metabase in your app to let your customers explore their data on their own. It connects to databases like MySQL, PostgreSQL, MongoDB, and many others, enabling users to build charts, dashboards, and run queries without writing SQL.

## Authentication

Metabase supports two primary methods for API authentication. The Metabase instance URL (for example, `https://metabase.example.com`) is stored with the selected authentication method and is not duplicated in integration config.

### API Key (Recommended)

Metabase can create API keys to authenticate programmatic requests to the API. To set the permissions for an API key, you can assign the key to a group.

- API keys are created in Admin Settings > Authentication > API Keys.
- Enter a key name, and select a group. The key will have the same permissions granted to that group.
- Pass the key via the `X-API-KEY` HTTP header with each request.
- Copy the generated API key and save it somewhere safe. Metabase won't be able to show you the key again. If you lose the key, you'll need to regenerate a new key.

### Session Token

To get a session token, submit a request to the `/api/session` endpoint with your username and password. This request will return a JSON object with a key called `id` and the token as the key's value. By default, sessions are good for 14 days.

- Pass the session token via the `X-Metabase-Session` HTTP header with subsequent requests.
- You should cache credentials to reuse them until they expire, because logins are rate-limited for security.

**Note:** Metabase also supports SSO mechanisms (SAML, JWT, LDAP, Google Sign-In) for user authentication in the application, but these are not used for direct API access. JWT-based authentication is only available on Pro and Enterprise plans.

## Features

### Questions (Cards)

Create, update, retrieve, and archive saved questions (called "cards" in the API). Programmatically create, modify, and manage questions and dashboards, and execute queries. Questions can be built using Metabase's JSON-based query language (MBQL) or native SQL. Results can be exported in JSON, CSV, or XLSX formats.

- Questions can be favorited, archived, and shared via public links.
- Questions can be organized into collections.

### Dashboards

Create, update, copy, and archive dashboards. Add or remove cards (questions) from dashboards, and share dashboards through public links.

- Dashboard parameters and filters can be configured programmatically.

### Collections

Organize questions, dashboards, and other items into collections (similar to folders). Create, update, and list items within collections. The API can return collection trees and items within a collection.

### Database Management

List connected databases, retrieve metadata (tables, fields, schemas), trigger schema syncs, and rescan field values.

- Supports a wide range of databases including PostgreSQL, MySQL, MongoDB, BigQuery, Snowflake, and many more.

### Query Execution

Execute ad-hoc queries against connected databases, either using MBQL or native SQL. Retrieve results in multiple formats (JSON, CSV, XLSX). Metabase lets you use Saved Questions as if they were data sources.

### User and Group Management

Create, update, deactivate, and reactivate users. Manage permission groups and assign users to groups.

### Permissions

Manage data permissions programmatically. Do a batch update of permissions by passing in a modified graph. This modified graph must correspond to the PermissionsGraph schema. If successful, this endpoint returns the updated permissions graph.

- The exposed data graph controls access to databases and tables.

### Embedding

Generate and revoke public links for questions and dashboards, and enable or disable dashboard embedding.

- Signed JWT generation and embedding-secret management are outside this integration's tool surface.

### Notifications and Alerts

Question alerts use the current `/api/notification` API. Alerts watch one saved question, use `has_result`, `goal_above`, or `goal_below` conditions, schedule runs with Quartz cron expressions, and deliver through email, Slack, or HTTP handlers. Archiving deactivates an alert and removes its scheduled subscription.

### Search

Search across all Metabase objects (questions, dashboards, collections, etc.) by providing a search term and optionally filtering by item type.

### Result Export

Saved question results can be downloaded in CSV, JSON, or XLSX format. Parameters and formatting options are sent in the JSON request body, and file bytes are returned as a downloadable file rather than embedded in structured output.

## Official API references

- [Metabase API documentation](https://www.metabase.com/docs/latest/api-documentation)
- [Working with the Metabase API](https://www.metabase.com/learn/metabase-basics/administration/administration-and-operation/metabase-api)
- [API keys](https://www.metabase.com/docs/latest/people-and-groups/api-keys)
- [API changelog](https://www.metabase.com/docs/latest/developers-guide/api-changelog)
- [Public sharing](https://www.metabase.com/docs/latest/embedding/public-links)

## Events

Metabase supports outbound webhooks tied to its alerting system.

### Alert Webhooks

Admins and people with settings access can set up webhooks to send alerts to a particular URL. This means you can set up an alert to send the results of a question to an endpoint of your choice.

- Webhooks are configured in Admin Settings > Notification Channels.
- Metabase will send the results of an alert in JSON. The JSON will include some metadata about the question, like the alert's creator and its ID. Metabase will send the attached visualization as a base64-encoded PNG, and the data as raw_data.
- Webhook authentication options: None, Basic (username/password), Bearer token, or API key (header or query param).
- Alerts are triggered on a schedule (minute, hourly, daily, weekly, monthly, or cron) based on question results — such as when results exist, when a time series crosses a goal line, or when a progress bar reaches a goal.

**Note:** Metabase does not support general-purpose event webhooks (e.g., for entity creation, updates, or deletions). Webhooks are exclusively used as a delivery channel for the alert/notification system.
