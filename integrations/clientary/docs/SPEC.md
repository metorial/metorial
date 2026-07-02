Now let me fetch the full API documentation to get more details on all available resources.Now let me check if Clientary has webhooks support:Let me fetch a few more API pages to get complete details on remaining resources.Now I have enough information to write the specification. Based on my research, Clientary does not natively support webhooks — the "triggers" seen on Zapier and Pipedream are polling-based integrations built by those platforms, not native webhook support from Clientary's API.

# Slates Specification for Clientary

## Overview

Clientary is an online invoicing, time tracking, and project management platform for small businesses and professional services firms. It provides tools for managing clients, leads, proposals, estimates, invoices, expenses, payments, recurring billing, and staff. The platform is developed by Unbrew, Inc. and based in San Jose, CA.

## Authentication

Clientary API access is available only through SSL/HTTPS. All authentication is performed via HTTP Basic Auth.

The API token is used as both the username and password in the Basic Auth header. Each user within a Clientary account has their own individual API token, which ties API actions to that specific user (e.g., for time tracking attribution).

**Required credentials:**

- **API Token**: Go to your user profile page in Clientary (found in the upper right corner after logging in). Click "Generate API Token" to generate a unique token.
- **Subdomain**: Your Clientary domain is required. If the full URL is `https://mygreatcompany.clientary.com`, the domain is `mygreatcompany`.

**Base URL format:** `https://{yourdomain}.clientary.com/api/v2/`

Your HTTP header must either contain `application/json` as an `Accept` type or you must suffix the resource URL with `.json`.

**Example request:**

```
curl 'https://{yourdomain}.clientary.com/api/v2/invoices' \
  -H 'Accept: application/json' \
  -u {api-token}:{api-token}
```

## Features

### Client Management

Create, retrieve, update, and delete client records representing companies or organizations. You can filter by update time for clients to get the latest changes. Clients contain contact information such as name, address, city, state, zip, country, website, and description.

### Contact Management

Manage individual contacts associated with clients or leads. Contacts represent people within client organizations.

### Lead Management

Leads represent companies, groups, organizations or other contact containers that are prospective Clients. Leads can contain estimates and contacts and can be converted to clients. Leads support sorting by name, newest, or oldest.

### Invoicing

Clientary provides programmatic access to invoices and invoice items. Create invoices with line items, taxes (up to three tax levels), and notes. Invoices can be scoped by client. Invoices include status tracking (draft, sent, viewed, paid, etc.), payment tracking, and support for multiple currencies. Invoices can be sent via email with options to send a copy to the sender and attach a PDF.

### Estimates

Manage estimates with line items, taxes, and notes. Estimates can be fetched under a specific client, and project-specific estimates can be retrieved by scoping by project_id. Estimates have statuses including Draft, Sent, Viewed, Cancelled, Declined, Revised, Accepted, and Archived.

### Project Management

Create and manage projects with configurable budget types (total budgeted hours or total budgeted amount) and project types (hourly rate or fixed amount). By default, only active and billable projects are returned. To retrieve closed projects, use the filter parameter with value `all`. Projects can be scoped to a specific client. Projects track worked hours, unbilled hours, cost, and budget. Deleting a project will result in the deletion of all associated Tasks, logged Hours, Comments, and Notes.

### Time Tracking (Hours)

Log time entries against projects. Each entry includes a title, date, hours, rate, and description. Time entries can be filtered by billed or unbilled status. The staff user corresponding to the API token is attributed for time entries created via the API.

### Task Management

Create and manage tasks within the account. Tasks can be assigned and tracked as part of project workflows.

### Expense Tracking

Track expenditures at the account, client, or project level. Expenses can be queried by date range (defaults to current fiscal year), by client, or by project. Expenses can be rebilled to recoup costs. Each expense includes an amount, date incurred, and optional description.

### Payment Management

Clientary provides programmatic access to payments. You can programmatically apply a payment to an invoice or remove an existing payment. Payments include transaction IDs when made through an integrated payment gateway (e.g., Stripe).

### Payment Profiles

Manage payment profiles which store payment method configurations for clients, used in conjunction with recurring schedules for automated billing.

### Recurring Schedules

Set up recurring invoice schedules that periodically generate new invoices. Configurable time intervals include weekly, biweekly, semimonthly, monthly, quarterly, semiannually, annually, and more. Actions on recurrence can be set to Send, Draft, or Autobill (requires a payment profile). Schedules support limited or unlimited occurrences, and can be active, paused, or stopped.

### Staff Management

Retrieve staff member information within the account. Each staff user has their own API token for individual attribution.

## Events

The provider does not support events. Clientary's API does not offer native webhooks or any built-in event subscription mechanism. Third-party platforms like Zapier and Pipedream implement polling-based triggers by periodically checking the API for new records, but this is not a native Clientary feature.
