There are multiple products called "Bonsai." The most prominent one for an integration platform context is **Hello Bonsai** (hellobonsai.com) — the freelance/agency business management platform. Let me check if they have a public API.Let me look at the Bonsai integrations help page and the Zapier integration for more details on the API capabilities and triggers.Now let me get more details on the full list of Zapier triggers/actions and check if Bonsai has a direct API.Now I have a comprehensive view. Let me compile the specification. Based on my research:

- Bonsai (hellobonsai.com) is a business management platform for freelancers and agencies
- It does NOT have a publicly documented REST API for direct integration
- It provides an API key for Zapier integration (generated in settings)
- The Zapier integration exposes triggers and actions via polling/webhooks through the Zapier platform
- From the API tracker, there are no public developer docs, API reference, or webhooks management API
- The Zapier triggers are all "instant" which suggests they use webhooks behind the scenes

# Slates Specification for Bonsai

## Overview

Bonsai (hellobonsai.com) is a business management platform for freelancers, agencies, and professional service companies. It provides tools for CRM, proposals, contracts, invoicing, project management, time tracking, scheduling, expense tracking, and bookkeeping. It is used by 500,000+ small businesses globally.

## Authentication

Bonsai uses **API Key** authentication. Under the Zapier integration settings, users click "Generate new API key" and copy their new API key. The API key is generated from the Bonsai integrations settings page at `https://app.hellobonsai.com/settings/integrations`.

The API key is provided in the designated 'API Key' field when connecting to external services.

Bonsai does not publish a standalone public API with its own developer documentation. Integration is primarily facilitated through this API key mechanism, which powers the Zapier connector and potentially other third-party integrations.

**Note:** Bonsai does not offer OAuth2 or other authentication flows. There are no publicly documented scopes or granular permission controls for the API key.

## Features

### Client Management

Create and manage client records including contact name, email, company name, website, phone number, job title, and notes. Manage all client relationships, communication history, and project details in one centralized dashboard.

### Proposals

Create branded proposals with customizable templates and automated follow-ups. Proposals support single or multiple service/package/pricing options. Clients can view and accept proposals.

### Contracts & Agreements

Generate legally-binding contracts with professional templates. Contracts support e-signatures and can be sent to clients or contractors for signing. Activity tracking shows when contracts are viewed or signed.

### Invoicing & Payments

Send branded invoices with automated payment reminders and multiple payment options. Supports recurring invoices, auto-invoicing from contracts, and multiple payment gateways (Stripe, PayPal, ACH, wire transfers, credit cards). Track invoice views and payment status.

### Project Management

Create projects linked to clients with descriptions, notes, and currency settings. Break projects into tasks, assign owners, set due dates and monitor progress. Tasks support descriptions, priorities, statuses, start/due dates, time estimates, assignees, tags, billing type, and recurring schedules. Tasks can be created from task templates.

### Time Tracking

One-click timers and daily/weekly timesheets capture billable hours accurately, feeding invoicing and utilization reports. Track billable and non-billable hours per task or project.

### Deals / Pipeline Management

Create and manage deals in a sales pipeline. Deals have a title, value, pipeline stage, owner, and associated client. Track deal updates as they progress through stages.

### Scheduling

Book meetings and events via Bonsai's built-in scheduling feature. Integrates with calendar tools for availability management.

### Forms

Create intake forms that can be embedded on websites or sent to clients. Collect form responses and use them to trigger automated workflows.

### Expense Tracking & Bookkeeping

Automatically match income and expenses, tag tax-deductible items, and export clean, reconciled books.

### Workflow Automations

Set up automatic actions to be performed when a key event happens. Supported triggers include contract signed, proposal accepted, first invoice paid, form filled out, and project completed. Actions include sending emails, sending forms, and scheduling meetings.

### Reporting

Set internal budgets, compare actuals vs. forecasts and surface profitability, utilization and sales metrics in interactive dashboards.

## Events

Bonsai does not provide a native webhooks API that developers can subscribe to directly. However, Bonsai exposes event triggers through its Zapier integration, which fires instant (webhook-based) notifications for the following event categories:

### Proposal Events

- **Proposal Viewed**: Fires when a proposal is viewed by the client.
- **Proposal Accepted**: Fires when a proposal is accepted by the client.

### Contract Events

- **Contract Viewed**: Fires when a contract is viewed by a client or contractor.
- **Contract Signed**: Triggers when a contract is signed by your contact (client or contractor).

### Invoice Events

- **Invoice Viewed**: Fires when an invoice is viewed by the client.
- **Invoice Paid**: Fires when an invoice is paid.

### Deal Events

- **Deal Updated**: Triggers when a deal is updated in Bonsai.

### Task Events

- **Task Updated**: Triggers when a task is updated in Bonsai.

### Scheduling Events

- **Event Scheduled**: Fires when a new event is booked via Bonsai Scheduling.

### Form Events

- **Form Submitted**: Fires when a new form response is submitted.

**Note:** These events are only accessible through Bonsai's Zapier integration and are not available as standalone webhook subscriptions via a direct API. There is no public webhook management API to register custom callback URLs independently of Zapier.
