Now let me get the full list of API operation groups from the official docs:# Slates Specification for Power BI

## Overview

Power BI is Microsoft's business intelligence platform that enables users to connect to data sources, create interactive dashboards and reports, and share insights across an organization. The Power BI REST APIs provide service endpoints for embedding, administration, governance, and user resources. The API base URL is `https://api.powerbi.com/v1.0/myorg/`.

## Authentication

Power BI uses **OAuth 2.0** via Microsoft Entra ID (formerly Azure Active Directory). To use the Power BI REST APIs, you need to register an Azure Active Directory (Azure AD) application in Azure.

**Prerequisites:**

- A Microsoft Entra ID (Azure AD) app registration
- A Client ID and Client Secret from the registered app
- A Tenant ID for your Azure AD directory

**OAuth 2.0 Endpoints (Microsoft Identity Platform v2.0):**

- Authorization URL: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize`
- Token URL: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`

**Scope:** Use `https://analysis.windows.net/powerbi/api/.default` as the scope value. Each API has the list of required scopes, so it depends on which API you are using.

**Available delegated permission scopes** include (prefixed with `https://analysis.windows.net/powerbi/api/`):

- `Dataset.ReadWrite.All`, `Dataset.Read.All`
- `Dashboard.Read.All`
- `Report.Read.All`, `Report.ReadWrite.All`
- `Group.Read`, `Group.Read.All`
- `Content.Create`
- `Metadata.View_Any`
- `Data.Alter_Any`
- `Workspace.Read.All`, `Workspace.ReadWrite.All`

The `offline_access` scope must be included in the app registration. Without this scope, users will need to re-authenticate every hour when the access token expires.

**Two authentication identity types are supported:**

1. **Delegated (Master User):** The app uses a user account to authenticate against Microsoft Entra ID. The master user account needs a Power BI Pro or Premium Per User (PPU) license. You need to define your app's delegated permissions (scopes).

2. **Service Principal (App-only):** Scopes are not required if you're using a service principal. Once you enable a service principal to be used with Power BI, the application's AD permissions don't take effect anymore. When using a service principal, the application's permissions are managed through the Power BI admin portal. For the client credentials grant flow, use `resource=https://analysis.windows.net/powerbi/api` (v1.0 endpoint) or the `.default` scope (v2.0 endpoint). The service principal must be added as a member or admin of the target workspace, and Power BI tenant admin settings must allow service principals to use the APIs.

## Features

### Workspace Management

Create, list, update, and delete workspaces (also referred to as "groups" in the API). Manage workspace membership by adding or removing users and configuring their roles (Admin, Member, Contributor, Viewer).

### Dataset Management

Create and update datasets to ensure reports stay current. Trigger and monitor dataset refreshes, manage data source credentials, configure refresh schedules, and manage dataset parameters. Supports taking over ownership of a dataset.

### Push Datasets

Push data directly into Power BI in real-time by creating push datasets and adding rows to tables. Useful for streaming/real-time dashboard scenarios without needing an underlying data source.

### Report Management

Retrieve and export reports for easy data sharing. Clone, rebind (change the underlying dataset), and export reports to file formats (PDF, PPTX, PNG). Manage report pages and permissions.

### Dashboard Management

Create and access dashboards to consolidate insights. Manage tiles on dashboards to reflect the latest data. Clone dashboards across workspaces and add or remove tiles.

### Embedding

Generate embed tokens and embed Power BI content in custom applications. Supports two embedding scenarios: "embed for your organization" (users authenticate with their own Power BI credentials) and "embed for your customers" (app owns the data, users don't need Power BI licenses).

### DAX Query Execution

Execute Data Analysis Expressions (DAX) queries against datasets. Only DAX queries are supported at this time. The user must have dataset read and build permissions.

### Deployment Pipelines

Deployment pipelines provide a structured way to manage the lifecycle of Power BI content across development, test, and production environments. They help enforce change control, reduce risk, and ensure consistent deployment practices. Developers can publish datasets and reports to the development stage. Using the REST API, content can then be promoted to test and production stages.

### Dataflows

Create and manage Power BI dataflows for reusable data preparation logic. Retrieve dataflow metadata, refresh dataflows, and manage dataflow storage accounts.

### Imports

Import Power BI Desktop files (.pbix), Excel files, or other supported formats into workspaces programmatically.

### Gateways

Manage on-premises data gateways and their data sources. List gateways, add or remove data sources, and manage gateway users.

### Admin Operations

Tenant-wide administrative operations available to Power BI admins or service principals. Includes scanning workspaces, listing all datasets/reports/dashboards/users across the tenant, managing encryption keys, and auditing capacity assignments. Some API features are only available to Pro or Premium users, limiting functionality for those on a free account.

### Apps

Retrieve published Power BI apps and their contents (dashboards, reports, tiles). Apps are read-only collections of content shared with an audience.

### Template Apps

Manage template apps that can be installed and customized by other organizations. Useful for ISVs distributing Power BI content.

### Capacities

List and manage Power BI Premium and Embedded capacities. Assign or unassign workspaces to capacities.

## Events

The official Microsoft Power BI API does not appear to have native webhook functionality. Webhooks are available in Microsoft Dataverse, which is part of the Power Platform that includes Power BI. However, this is separate from the Power BI API itself.

The provider does not support events (webhooks or built-in event subscriptions) through the Power BI REST API directly. Event-driven workflows require external orchestration tools such as Microsoft Power Automate or Azure Event Grid.
