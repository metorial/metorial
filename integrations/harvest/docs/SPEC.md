# Harvest API Specification

## Overview

Harvest is a time tracking and invoicing application for businesses and freelancers. The Harvest V2 API is a REST API that allows you to interact with your Harvest account programmatically — you can track time, log expenses, create projects, and more. API permissions mirror account permissions: Administrators can access all API calls, Managers can access the projects and people they manage, and Members can only access their own data.

## Authentication

Harvest supports two authentication methods:

### 1. Personal Access Tokens

A Personal Access Token is tied directly to you and is the quickest way to start playing around with the API. The API can be accessed by creating a Personal Access Token from the **Developers** section of Harvest ID (https://id.getharvest.com/developers). After creating it you'll be provided with a random token and a list of your account IDs.

Once generated, a Personal Access Token can be used to access the API by providing the token in the Authorization header. Each request will require your account ID as well, since you can use this Personal Access Token to access any of your Harvest or Forecast accounts.

Required headers for every request:

- `Authorization: Bearer {ACCESS_TOKEN}`
- `Harvest-Account-Id: {ACCOUNT_ID}`
- `User-Agent: AppName (contact@email.com)`

### 2. OAuth2

Implementing a full OAuth2 Authentication flow allows other people to use your Harvest integrations.

To set up OAuth2, register an application at https://id.getharvest.com/developers with the following:

- **Name** – name of your application.
- **Redirect URL** – the URL where successful authentications are redirected.
- **Multi Account** – whether your integration supports multiple account access or just one.
- **Products** – scope of access; can be Harvest, Forecast, or both.

**Authorization Code Flow (server-side):**

- Authorization URL: `https://id.getharvest.com/oauth2/authorize?client_id={CLIENT_ID}&response_type=code`
- Token URL: `https://id.getharvest.com/api/v2/oauth2/token`
- Supports `grant_type=authorization_code` and `grant_type=refresh_token`
- Access tokens expire in 1,209,600 seconds (approximately 14 days) and can be refreshed using the refresh token.

**Implicit Grant Flow (client-side):**

- Authorization URL: `https://id.getharvest.com/oauth2/authorize?client_id={CLIENT_ID}&response_type=token`
- Returns an access token directly; no refresh token is provided.

**Scopes:**

Scopes define which accounts the user grants access to. Possible scope values include:

- `harvest:{ACCOUNT_ID}` – access to a specific Harvest account
- `forecast:{ACCOUNT_ID}` – access to a specific Forecast account
- `harvest:all` / `forecast:all` – access to all Harvest or Forecast accounts
- `all` – access to all accounts

Use `GET https://id.getharvest.com/api/v2/accounts` to discover which accounts the authenticated user has access to.

## Features

### Time Tracking

Create, update, delete, and list time entries. Time entries can be created either via duration (specifying hours) or via start/end time. You can start and stop running timers, and associate time entries with projects and tasks. Time entries support external references for linking to third-party tools (e.g., Trello cards, Basecamp to-dos).

### Project Management

Create and manage projects with configurable billing methods (by project, task, or person), budget types (by hours or total cost), and budget tracking with over-budget notifications. Assign users and tasks to projects. Projects can be billable or non-billable, and fixed-fee or hourly.

### Client Management

Create, update, and list clients and client contacts. Clients are associated with projects and invoices.

### Invoicing

Create, update, and manage invoices with individual line items. Send invoice messages (e.g., send/share via email), and record invoice payments. Manage invoice item categories for organizing line items.

### Estimates

Create, update, and manage estimates. Send estimate messages to clients. Manage estimate item categories.

### Expense Tracking

Log and manage expenses, optionally attached to projects. Organize expenses using expense categories. Expenses can include receipt attachments.

### Task Management

Create and manage task types that can be assigned to projects. Tasks can have default hourly rates and can be marked as billable or non-billable by default. Tasks cannot be deleted if they have associated time entries.

### User Management

Create, list, update, archive, and delete users. Manage user roles, teammates, billable rates, cost rates, and project assignments. Users can be administrators, managers, or regular members.

### Roles

Create and manage roles that can be assigned to users for organizational purposes.

### Reporting

Generate reports including:

- **Time Reports** – time tracked across projects, tasks, and users.
- **Expense Reports** – expenses grouped by various dimensions.
- **Uninvoiced Report** – uninvoiced time and expenses.
- **Project Budget Report** – budget consumption for projects.

### Company Settings

Retrieve and update company-level settings such as timezone, currency, and time tracking preferences.

## Events

The official Harvest API does not have native webhook support. The official Harvest API documentation does not mention webhooks. The provider does not support events.


## Integration refresh (0.2.1)

- `list_accounts` discovers authorized Harvest accounts without requiring a setup account ID. For one account, authentication persists the default account ID. Other tools accept an optional `accountId`; existing saved account selections remain supported.
- `get_current_user` retrieves the authenticated account user through `/v2/users/me`.
- `list_estimates` exposes estimate IDs and documented filters for the existing estimate workflow. It uses page-based pagination.
- Clients, projects, tasks, and users support cursor navigation using `cursor` and `nextCursor`. Existing numeric `page` output remains compatible; `pageNumberKnown` indicates when a cursor response omitted the page number.
- OAuth token requests use form encoding and preserve refresh tokens when no replacement is returned. New OAuth consent requests Harvest access only.
- `send_invoice` emails when `eventType` is omitted. `send`, `close`, `draft`, and `re-open` record lifecycle events without emailing.
- Payment date fields are mutually exclusive; new invoice/estimate line items require `kind` and `unitPrice`; new expenses require `totalCost` or `units`.
