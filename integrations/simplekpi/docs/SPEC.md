Now let me check for more details on Groups and Reports API resources:# Slates Specification for Simplekpi

## Overview

SimpleKPI is a performance management tool that allows businesses to track and visualize their key performance indicators (KPIs) in a user-friendly dashboard. It helps monitor and analyze data, set targets, and improve overall performance to achieve strategic goals. The API provides programmatic access to manage KPIs, users, groups, data entries, and reports.

## Authentication

SimpleKPI uses **HTTP Basic Authentication**.

- The API is SSL-only and can only be accessed via `https://{subdomain}.simplekpi.com/api/`. The authorization is basic authentication with your username and account API token.
- **Username**: Your SimpleKPI account email address.
- **Password**: Your account API token. This token is available in your SimpleKPI account under the Settings | Developer API section.
- **Subdomain**: Your account-specific subdomain (e.g., `mycompany` in `https://mycompany.simplekpi.com/api/`).

**Important considerations:**

- API access is disabled by default and must be enabled before the API can be accessed.
- The Individual price plan does not have access to the API and you will need to upgrade your plan to gain access.

**Example:**

```
curl -u {email_address}:{api_token} \
  -H "Content-Type: application/json" \
  https://{subdomain}.simplekpi.com/api/users
```

Alternatively, you can construct the Basic Auth header manually by Base64-encoding `{email_address}:{api_token}` and passing it as `Authorization: Basic {encoded_string}`.

## Features

### KPI Management

Create, retrieve, update, and delete KPIs. Each KPI has properties like id, name, description, target_default, and aggregate_function. KPIs can be configured with a frequency (daily, weekly, etc.), a measurement unit, an icon, a value direction (up/down/neutral), and an aggregation method (SUM, AVG, etc.). KPIs can also be organized within categories.

### KPI Data Entry

Record actual and target values for KPIs over time. Entries include user, KPI, date, actual value, target value, and notes. Entries can be queried by user, KPI, and date range. You can also use email addresses instead of user IDs when posting entries. Supports options to set or increment actual values, and to selectively update actuals, targets, or notes.

### KPI Categories

Organize KPIs into categories. You can create, list, update, and delete categories, and manage which KPIs belong to each category.

### User Management

Manage user accounts with properties like id, user_type, user_status_id, first_name, last_name, email, and permissions. Users can be created, updated, retrieved, and deleted. Permissions include the ability to manage other users and administer settings.

### User-KPI Assignments

KPIs are assigned to users, which determines what KPIs the user can enter data against and what KPIs the user can analyze. It also sets the target for the User KPI if the user has a target that is different to the default KPI target.

### Groups and Group Items

Organize users and data into groups (e.g., departments, teams). Groups contain group items, and group items can be assigned to users. This allows filtering and segmenting KPI data by organizational structure.

### KPI Configuration Resources

Manage supporting configuration for KPIs:

- **KPI Units**: Define display and entry formats for KPI values (e.g., percentages, currencies).
- **KPI Frequencies**: Retrieve available tracking frequencies (daily, weekly, monthly, etc.).
- **KPI Icons**: Retrieve available icons for visual representation of KPIs.

### Reporting

Query processed KPI data entries for reporting purposes, including calculated KPIs. Reports can be filtered by KPI IDs, date range, user IDs, and group item IDs. This is the main way to extract aggregated performance data for analysis.

## Events

The provider does not support events. SimpleKPI's API does not offer webhooks or any built-in event subscription mechanism.
