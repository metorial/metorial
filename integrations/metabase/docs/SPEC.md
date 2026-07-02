# Slates Specification for Metabase

## Overview

Metabase is an open-source business intelligence and analytics platform. You can use Metabase to ask questions about your data, or embed Metabase in your app to let your customers explore their data on their own. It connects to databases like MySQL, PostgreSQL, MongoDB, and many others, enabling users to build charts, dashboards, and run queries without writing SQL.

## Authentication

Metabase supports two primary methods for API authentication. The Metabase instance URL (e.g., `https://your-metabase.com`) is required for all methods.

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

Create, update, retrieve, and delete saved questions (called "cards" in the API). Programmatically create, modify, and manage questions and dashboards, and execute queries. Questions can be built using Metabase's JSON-based query language (MBQL) or native SQL. Results can be exported in JSON, CSV, or XLSX formats.

- Questions can be favorited, archived, and shared via public links.
- Questions can be organized into collections.

### Dashboards

Create, update, copy, and delete dashboards. Add or remove cards (questions) from dashboards. Dashboards can be favorited, archived, reverted to prior revisions, and shared via public links.

- Dashboard parameters and filters can be configured programmatically.

### Collections

Organize questions, dashboards, and other items into collections (similar to folders). Create, update, and list items within collections. The API can return collection trees and items within a collection.

### Database Management

Add a new database using the API, and validate that database's connection details. List connected databases, retrieve metadata (tables, fields, schemas), trigger syncs, and rescan databases.

- Supports a wide range of databases including PostgreSQL, MySQL, MongoDB, BigQuery, Snowflake, and many more.

### Query Execution

Execute ad-hoc queries against connected databases, either using MBQL or native SQL. Retrieve results in multiple formats (JSON, CSV, XLSX). Metabase lets you use Saved Questions as if they were data sources.

### User and Group Management

Automate tasks like configuring instances, creating users, and setting up database connections. Create, update, deactivate users. Manage permission groups and assign users to groups.

### Permissions

Manage data permissions and collection permissions programmatically. Do a batch update of permissions by passing in a modified graph. This modified graph must correspond to the PermissionsGraph schema. If successful, this endpoint returns the updated permissions graph.

- Permissions control access to databases, tables, and collections.

### Embedding

Generate public links for questions and dashboards. Manage embedding settings for cards and dashboards using signed JWTs.

- Supports both public link sharing and secure embedding with signed tokens.

### Notifications and Alerts

Set up alerts on questions that trigger when specific conditions are met (e.g., results exist, a goal line is crossed). Select when you want Metabase to check the results: by the minute, hourly, daily, weekly, monthly, or on a custom schedule. Alerts can be sent to email, Slack, or webhooks.

### Search

Search across all Metabase objects (questions, dashboards, collections, etc.) by providing a search term and optionally filtering by item type.

### Instance Configuration

Configure settings using the `/api/settings` endpoint, set up email using the `/api/email` endpoint. Automate initial setup including creating the first admin user via the `/api/setup` endpoint.

### Data Upload

Upload CSV files to create new tables or append to existing ones within connected databases.

## Events

Metabase supports outbound webhooks tied to its alerting system.

### Alert Webhooks

Admins and people with settings access can set up webhooks to send alerts to a particular URL. This means you can set up an alert to send the results of a question to an endpoint of your choice.

- Webhooks are configured in Admin Settings > Notification Channels.
- Metabase will send the results of an alert in JSON. The JSON will include some metadata about the question, like the alert's creator and its ID. Metabase will send the attached visualization as a base64-encoded PNG, and the data as raw_data.
- Webhook authentication options: None, Basic (username/password), Bearer token, or API key (header or query param).
- Alerts are triggered on a schedule (minute, hourly, daily, weekly, monthly, or cron) based on question results — such as when results exist, when a time series crosses a goal line, or when a progress bar reaches a goal.

**Note:** Metabase does not support general-purpose event webhooks (e.g., for entity creation, updates, or deletions). Webhooks are exclusively used as a delivery channel for the alert/notification system.
