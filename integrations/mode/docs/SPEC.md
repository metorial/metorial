Now let me get the full list of webhook events:Now I have all the information needed to write the specification.

# Slates Specification for Mode

## Overview

Mode is a collaborative analytics platform that enables teams to write SQL queries, build reports and dashboards, and perform advanced analytics using Python and R notebooks. Mode lets teams work together to solve problems and make better decisions with data. To access Mode's API, you must be a member of a Mode Business Workspace, and only resources within a Mode Business Workspace are accessible via the API.

## Authentication

Mode uses **HTTP Basic Authentication** with API tokens.

API tokens allow you to connect to Mode's API programmatically. An API token is used instead of your email address and account password whenever you programmatically authenticate to Mode with basic authentication.

Currently, Mode supports three types of access tokens – Workspace API tokens, Member API tokens, and personal API tokens.

**Workspace API Tokens** (recommended):

- Only Admins are able to create Workspace tokens. To create one, navigate to your Workspace Settings > Privacy & Security > API. Click the "gear" icon and select "Create new API token."
- The Workspace API tokens are meant to be used for programmatic management. Workspace and Member API tokens cannot be used with the Clone endpoint for Report Runs or for creating new invites; granular permissions are not currently supported with the Workspace API tokens — they allow admin access to the Workspace for now.

**Member API Tokens:**

- To enable the Member API tokens feature, Admins can navigate to your Workspace Settings > Features > API Keys > Member keys.
- The Member API tokens are meant to be used by a single user for individual use cases, such as updating a specific Report or managing a Collection. These tokens mimic the individual user's access to the resources in the Workspace.

Each token consists of two parts:

- **Token**: The public component of the credential, often referred to as the username or access key during authentication.
- **Secret**: The private component of the credential, often referred to as the password or access secret during authentication. This is only shown once when creating the token and must be saved.

To authenticate, use the Token as the username and Secret as the password via HTTP Basic Auth against the base URL `https://app.mode.com/api`. API calls also require a `workspace_name` parameter (the account slug), which appears in your Mode URL as `app.mode.com/home/{workspace_name}`.

## Features

### Report Management

Create, retrieve, update, archive, and delete reports within a workspace. Reports live in Collections and can contain SQL queries, Python/R notebooks, and visualizations. Every report lives in a Collection, and can contain SQL queries, a Python or R Notebook, visualizations, report themes, etc. Reports can be filtered and ordered by creation or update timestamps.

### Query Management

Create, update, and manage SQL queries within reports. Each query is associated with a data source and can be executed as part of a report run. Parameters can be configured using form fields.

### Report Runs and Query Runs

Trigger report executions (runs) and retrieve results, including individual query run outputs. Results can be exported as CSV or PDF. Report runs can be triggered manually via the API or on a schedule.

### Report Scheduling and Distribution

Configure a report to run on a regularly occurring schedule. Schedules support configurable frequency (daily, weekly, monthly), time zone, hour, minute, and day parameters. You can also manage report subscriptions to control who receives scheduled report outputs.

### Collection (Space) Management

Manage Collections (formerly called Spaces) that organize reports and datasets. List all Collections in a workspace, including public and private ones. Retrieve reports within specific Collections.

### Dataset Management

Datasets are curated tables of data that can be reused across multiple reports. Every Dataset lives in a Collection and contains a SQL query. You can use the dataset resource to manage individual Mode datasets. Datasets can be filtered by data source and ordered by creation or update timestamps.

### Data Source Management

Manage database connections within a workspace. List connected data sources and view reports or datasets associated with each data source.

### Definition Management

Create, update, and manage metric definitions within a workspace. Definitions provide a shared vocabulary for key metrics across the organization. They can be listed and filtered by tokens.

### Workspace Member Management

Retrieve and manage workspace memberships, including listing members and their roles within the workspace.

### Python/R Notebooks

Access and manage Python and R Notebooks associated with reports, including exporting consolidated notebook scripts or individual cells.

## Events

Mode supports webhooks that send real-time POST notifications to a URL of your choice when specific events occur in your workspace. Mode's webhooks are designed to be light weight and secure, since the payload itself does not contain sensitive information. The payload contains the event name and a link to the relevant API endpoint. Only admins can enable webhooks via Workspace Settings > Webhooks.

### Report Events

- **Report created** (`report_created`): Fires when a new report is created in the workspace.
- **Report deleted** (`report_deleted`): Fires when a report is deleted. Includes the report name and token in the payload.

### Report Run Events

- **Report run started** (`report_run_started`): Fires when a report run begins execution.
- **Report run completed** (`report_run_completed`): Fires when a report run finishes execution. Useful for triggering alerts based on query results or distributing report outputs.

### Data Source Events

- **New database connection** (`new_database_connection`): Fires when a new data source is connected to the workspace.

### Definition Events

- **Definition created** (`definition_created`): Fires when a new metric definition is created.
- **Definition updated** (`definition_updated`): Fires when an existing metric definition is modified.

### Membership Events

- **Member joined** (`member_joined_organization`): Fires when a new member joins the workspace.
- **Member removed** (`member_removed_from_organization`): Fires when a member is removed from the workspace.
