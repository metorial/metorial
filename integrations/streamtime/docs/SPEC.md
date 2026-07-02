Let me fetch the Swagger API documentation to understand the available endpoints and features.Let me fetch the Swagger spec to get the full list of API resources.Now I have enough information to create a comprehensive specification. Let me compile everything.

# Slates Specification for Streamtime

## Overview

Streamtime is a cloud-based project management platform designed for creative businesses and agencies. It provides job planning, time tracking (via to-do lists), team scheduling, quoting, invoicing, expense management, Kanban boards, and profitability reporting. It integrates natively with accounting platforms like Xero, QuickBooks, and MYOB.

## Authentication

Streamtime uses API keys for authentication.

To authenticate with the Streamtime API:

1. Navigate to Settings → Integrations under Account Settings. Scroll down to the API section and hit Connect. You will then have access to your key. Copy and paste the string.
2. Only the account subscriber can access this key.
3. The API key is passed as a Bearer token in the `Authorization` header: `Authorization: Bearer {api_key}`
4. The base URL for API requests is `https://api.streamtime.net/v1/` (v1) or `https://api.streamtime.net/v2/` (v2 beta).

There are no OAuth flows or scopes. A single API key provides access to all data within the organization.

## Features

### Job Management

Create, update, and search for jobs (projects). Jobs are the central entity in Streamtime, containing job plans with phases, line items, team member assignments, estimated hours, deadlines, and milestones. Jobs can be filtered by status (e.g., "In Play"), labels, company, and other attributes. You can also assign jobs to job groups and assign lead users to jobs.

### Contact and Company Management

Create new contacts and new jobs in Streamtime. Search and retrieve companies and contacts, including associated details. Companies contain contacts, and contacts can be linked to jobs and invoices.

### To-Do / Time Tracking

The platform uses to-do lists for time tracking, which are auto-populated directly from job plans. Through the API, you can create, update, and search to-do items. Time entries are logged when team members complete to-do items.

### Quoting and Invoicing

Turn job plans into quotes and invoices; with everything, even expenses, rolled into one accurate bill. Quotes and invoices can be searched and managed through the API. Invoices can be created from job plans, quotes, or time and expenses.

### Expense Management

Manage expenses associated with jobs, including linking supplier contacts to expenses and assigning expenses to job phases. Expenses can be synced with accounting integrations.

### Advanced Search and Filtering

The API provides a powerful search system using "search views" for different data types (e.g., Jobs = searchView 7, Invoices = searchView 11). Filters can be combined using AND/OR logic through nested filter group collections. Available filters for each search view can be retrieved dynamically.

### Reporting and Statistics (v2)

The v2 API introduces `column_series` and `time_series` requests for reporting, allowing you to specify which fields to aggregate, the calculation method (count, sum, average), and even combine statistics from multiple data sources (e.g., logged hours + invoice totals + quote totals) in a single request.

### User Management

Retrieve user/team member information. Users are associated with jobs, to-dos, and scheduling.

### Custom API Calls

The API supports arbitrary custom requests for any endpoint documented in the Swagger specification, allowing access to any resource not covered by pre-built modules.

## Events

The provider does not support webhooks or event subscriptions through its public API. Streamtime does not offer a native webhook registration mechanism for third-party consumers. Integration platforms like Zapier and Make use polling-based triggers (e.g., checking for new jobs) rather than native webhook events from Streamtime.
