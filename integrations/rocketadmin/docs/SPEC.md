Let me get more details about Rocketadmin's specific API authentication and features.Now let me check the login endpoint and how API keys are actually used for authentication:Now I have enough information to compile the specification. Let me write it up based on all the research.

# Slates Specification for Rocketadmin

## Overview

Rocketadmin is an admin panel builder that connects to databases like MySQL, PostgreSQL, MongoDB, and others, providing auto-generated CRUD UI, permissions, and audit logs. It is a scalable solution that simplifies database management, making it accessible to a broader audience while maintaining flexibility for complex tasks. It is available as both a cloud-hosted service and a self-hosted open-source deployment.

## Authentication

Rocketadmin supports two authentication methods for its API:

### 1. JWT Token (Email/Password Login)

Users can authenticate by logging in with email and password via `POST /user/login`. This returns a JWT token that must be included in subsequent requests. The platform also supports optional two-factor authentication (2FA/OTP), which requires an additional step to validate the token after initial login.

Additionally, Rocketadmin supports social login via GitHub and Google, as well as SAML-based SSO for enterprise use cases.

### 2. API Key

You can access Rocketadmin features through the API using an API key generated from your account settings. To create an API key:

1. Go to the Rocketadmin Dashboard, navigate to Account settings.
2. Enter a title for the key and click "Generate."
3. Copy and securely store the generated key.

API keys are managed via the `/apikey` endpoints (create, check, list, delete). The API key is used for external integrations (e.g., Zapier) and for endpoints marked "API+" in the documentation, such as table row CRUD operations. The key is passed as an authentication header in requests.

### Connection Master Password (optional)

Rocketadmin allows you to enable client-side encryption during connection creation, generating a unique master password. This master password is not stored on Rocketadmin servers — it is kept only in the user's browser and must be shared with all authorized users. It acts as an additional authentication factor for accessing specific database connections.

**Base URL:** `https://app.rocketadmin.com` (cloud) or your self-hosted instance URL.

## Features

### Database Connection Management

Create, update, test, and delete connections to supported databases (PostgreSQL, MySQL, MongoDB, MSSQL, Oracle, MariaDB, IBM Db2, ScyllaDB, and others). Connections can be made directly or through the Rocketadmin Agent for databases behind firewalls. Databases behind firewalls can be connected through secure SSH tunnels. Connection properties and settings can be configured per connection.

### Table Data Operations (CRUD)

Perform full CRUD operations on table rows: add, read, update, and delete rows by primary key. Supports single and bulk operations for both update and delete. Rows can be filtered using filter parameters. Tables can be listed and their structures inspected. These endpoints are marked "API+" and require an API key.

### CSV Import/Export

Export table data as CSV files and import CSV files into tables. Activity logs can also be exported as CSV, filtered by date range, user, and table name.

### User & Company Management

Manage companies (organizations), including inviting users, removing users, suspending/unsuspending users, and updating user roles. Supports fine-grained access control with user groups, role management, table-level access, and field-level control.

### Groups & Permissions

Create and manage groups within connections. Assign users to groups and configure granular permissions per group, controlling access at the table and field level.

### Dashboards & Widgets

Create, update, and delete dashboards for connections. Add widgets to dashboards for data visualization. Supports 16+ specialized UI widgets to customize data display and editing, including boolean toggles, select dropdowns, and more. AI can be used to auto-generate dashboards and widgets.

### Action Rules & Custom Actions

Define rules for tables with events and actions. Custom Actions extend functionality for any row — such as creating reports, issuing refunds, publishing content, or assigning roles. Custom Actions make use of webhooks, meaning they can be integrated with anything regardless of language. Rules support custom events that can be activated programmatically.

### AI Insights & Assistant

Query table data using natural language via AI. Supports conversational AI threads with message history. AI can also auto-generate table settings and widget configurations for connections. Requires an OpenAI API key to be configured.

### Saved Queries

Create, save, test, execute, update, and delete database queries for a connection. Useful for frequently used or complex queries.

### Audit Logging

Complete activity logging and audit trails for compliance, including sign-in audit trails, with the ability to export logs as CSV and filter by date/user.

### Table Settings & Filters

Configure display settings per table, including personal table settings per user. Create and manage reusable filter sets for tables.

### Custom Fields

Create, update, and delete custom fields on tables for additional metadata.

### White-Label & Branding

Run Rocketadmin on your own domain with company branding, with full white-label support for both cloud and self-hosted deployments. Upload custom logos, favicons, and tab titles.

### Secrets Management

Create, update, delete, and retrieve company-level secrets (e.g., API keys, credentials). Includes an audit log for secret access.

### Zapier Integration

Rocketadmin features full Zapier integration, allowing connection to over 8,000 other apps through automation workflows.

## Events

Rocketadmin supports outbound webhooks through its **Action Rules** system. Custom Actions on table rows are webhook-based, meaning when a defined event/trigger occurs on a table (e.g., a row is created, updated, or deleted), Rocketadmin can fire an HTTP request to a configured webhook URL.

### Table Row Events

- Action rules can be configured per table to trigger actions when rows are created, updated, or deleted.
- Custom events can also be defined and activated programmatically via the API.
- Actions within a rule can be activated individually or all at once.

Rocketadmin does not appear to support inbound webhook subscriptions (i.e., notifying external systems of arbitrary platform-level changes via a subscription mechanism). The webhook functionality is tied specifically to the Action Rules system for table-level triggers.
