Now let me check the webhook event types available:Now I have a comprehensive understanding of Zoho Invoice. Let me note that Zoho Invoice uses workflow-based webhooks (configured through Settings > Automation > Webhooks) rather than a dedicated webhook API. The webhooks are tied to workflow rules rather than being a standalone webhook subscription API. Let me compile the specification.

# Zoho Invoice Integration Specification

## Overview

Zoho Invoice is an online invoicing application that allows businesses to create and manage invoices, estimates, expenses, and projects. It supports multi-currency transactions, time tracking, customer and contact management, recurring invoices, credit notes, and customer payments. Zoho Invoice is part of Zoho's broader suite and shares infrastructure with Zoho Billing.

## Authentication

Zoho Invoice uses OAuth 2.0. The integration exposes one OAuth method for a customer-owned regular regional or Multi-DC server application. `applicationType` is required. `region` is required for a regional application and optional for Multi-DC as an expected-region constraint.

### Setup

1. Register a regular regional or Multi-DC server application at [Zoho's Developer Console](https://accounts.zoho.com/developerconsole) and supply its Client ID and Client Secret when connecting.
2. Regional authorization starts at the selected regional Accounts origin. Multi-DC authorization starts at `https://accounts.zoho.com/oauth/v2/auth`.
3. Treat callback `location` and `accounts-server` as optional routing hints. Validate every supplied hint and require both to agree when present. Without either hint, use the selected regional origin, or try only the supported Accounts origins for a regionless Multi-DC application until Zoho accepts the code. Multi-DC discovery requires shared OAuth credentials across enabled data centers. The resolved region must match the regional selection or an optional Multi-DC expected-region constraint.
4. Refresh requests use the persisted regional Accounts origin and preserve the existing refresh token when Zoho omits a replacement.
5. Invoice API requests use the allowlisted `api_domain` returned by Zoho.

### Regional Data Centers

The validated callback Accounts origin determines code exchange and refresh routing. Invoice requests use the matching allowlisted API origin returned in the token response:

| Region | Accounts origin | Allowed Invoice API origin |
| --- | --- | --- |
| US | `https://accounts.zoho.com` | `https://www.zohoapis.com` |
| EU | `https://accounts.zoho.eu` | `https://www.zohoapis.eu` |
| IN | `https://accounts.zoho.in` | `https://www.zohoapis.in` |
| AU | `https://accounts.zoho.com.au` | `https://www.zohoapis.com.au` |
| JP | `https://accounts.zoho.jp` | `https://www.zohoapis.jp` |
| CA | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca` |

Connections created with the previous region-specific OAuth methods must reconnect with the unified `oauth` method and select their region.

### Request Headers

The Organization ID and the Access token must be sent as headers in the API. Specifically:

- `Authorization: Zoho-oauthtoken {access_token}`
- `X-com-zoho-invoice-organizationid: {organization_id}`

The organization_id can be obtained from the `GET /organizations` API response (requires scope `ZohoInvoice.settings.READ`).

### OAuth Scopes

Scopes follow the pattern `ZohoInvoice.{module}.{action}` where action is CREATE, READ, UPDATE, or DELETE. Available modules:

- `contacts` — Customer/contact management
- `settings` — Items, expense categories, users, taxes, currencies
- `estimates` — Estimates
- `invoices` — Invoices
- `customerpayments` — Customer payments
- `creditnotes` — Credit notes
- `projects` — Projects
- `expenses` — Expenses

Use `ZohoInvoice.fullaccess.all` for full access to all modules.

#### Declared Scope Contract

```ts
[
  'ZohoInvoice.fullaccess.all',
  'ZohoInvoice.contacts.CREATE',
  'ZohoInvoice.contacts.READ',
  'ZohoInvoice.contacts.UPDATE',
  'ZohoInvoice.invoices.CREATE',
  'ZohoInvoice.invoices.READ',
  'ZohoInvoice.invoices.UPDATE',
  'ZohoInvoice.estimates.CREATE',
  'ZohoInvoice.estimates.READ',
  'ZohoInvoice.estimates.UPDATE',
  'ZohoInvoice.customerpayments.CREATE',
  'ZohoInvoice.customerpayments.READ',
  'ZohoInvoice.customerpayments.UPDATE',
  'ZohoInvoice.creditnotes.CREATE',
  'ZohoInvoice.creditnotes.READ',
  'ZohoInvoice.creditnotes.UPDATE',
  'ZohoInvoice.expenses.CREATE',
  'ZohoInvoice.expenses.READ',
  'ZohoInvoice.expenses.UPDATE',
  'ZohoInvoice.projects.CREATE',
  'ZohoInvoice.projects.READ',
  'ZohoInvoice.projects.UPDATE',
  'ZohoInvoice.settings.CREATE',
  'ZohoInvoice.settings.READ',
  'ZohoInvoice.settings.UPDATE'
]
```

| Capability group | Requested scope |
| --- | --- |
| Contact, invoice/recurring-invoice, estimate, payment, credit-note, expense, project/time-entry, and item operations | The matching documented CREATE, READ, and UPDATE scopes listed above |
| Product-wide resource access | `ZohoInvoice.fullaccess.all` |

The [Zoho Invoice OAuth documentation](https://www.zoho.com/invoice/api/v3/oauth/) documents resource-level CREATE, READ, UPDATE, and DELETE operations, but not resource-level ALL. Current tools and polling triggers create, read, and update these resources and expose no delete operation, so DELETE variants are omitted.

The integration requests the documented operation-specific scopes used by current tools and polling triggers, plus `ZohoInvoice.fullaccess.all` for product-wide resource access. Unused operation variants are omitted.
## Features

### Invoice Management

Create, update, send, and manage invoices for customers. Invoices support line items, taxes, discounts, custom fields, shipping details, payment terms, and PDF templates. Invoices can have statuses including sent, draft, overdue, paid, void, unpaid, partially_paid, and viewed. You can mark invoices as sent or void, write off invoices, apply credits, send payment reminders, email invoices (individually or in bulk), and manage attachments. Supports GST, VAT, and CFDI (Mexico) tax treatments.

### Recurring Invoices

Create invoices that automatically repeat on a schedule. You can configure the recurrence interval, start/end dates, and associated customer. Recurring invoices can be stopped and resumed as needed.

### Estimates

Create and manage quotes/estimates for customers. Estimates can be marked as sent, accepted, or declined. They support the same line item structure as invoices, including custom fields and PDF templates. Estimates can be emailed individually or in bulk.

### Contact Management

Manage customers and their contact persons. Contacts support multiple addresses (billing and shipping), portal access, payment reminders, and client reviews. You can email statements to contacts, add comments, and manage associated refunds.

### Customer Payments

Record and manage payments received from customers. Payments can be applied to specific invoices. Supports refunding excess customer payments and tracking refund details.

### Credit Notes

Create and manage credit notes to offset invoice balances. Credits can be applied to specific invoices. Credit notes can be voided and reopened. Supports refunding credit note amounts.

### Retainer Invoices

Create and manage retainer (advance payment) invoices. Similar functionality to regular invoices with the ability to mark as sent, void, or draft, and manage through their lifecycle.

### Expense Tracking

Record billable and non-billable expenses. Manage expense categories and employees. Supports recurring expenses that can be stopped and resumed.

### Project Management and Time Tracking

Create and manage projects associated with customers. Projects support tasks, user assignments, and comments. Time entries can be logged against projects and tasks, with a built-in timer (start/stop functionality). Time entries can be associated with invoices for billing.

### Items and Price Lists

Manage a catalog of products and services (items) that can be added to invoices and estimates. Items can be marked as active or inactive and support custom fields. Price lists allow defining custom pricing for different customers or scenarios.

### Tax Configuration

Create and manage tax rates, tax groups, tax exemptions, and tax authorities. Supports region-specific tax systems including GST, VAT, and US sales tax.

### Currency and Exchange Rates

Manage multiple currencies and exchange rates for multi-currency invoicing.

### Organization Management

Create, update, and manage organizations. Each organization is independent with its own organization ID, base currency, time zone, language, contacts, and reports.

### User Management

Create, invite, update, and manage users within an organization. Users can be marked as active or inactive.

### Zoho CRM Integration

Import customers from Zoho CRM using CRM account IDs or contact IDs when the Zoho Invoice–Zoho CRM integration is enabled.

## Events

Zoho Invoice supports outbound webhooks through its workflow automation system. Webhooks are configured via the Zoho Invoice UI under Settings > Automation, where they are associated with workflow rules rather than registered through a dedicated webhook API endpoint.

### Workflow-Based Webhooks

You enter the URL of the external service provider's API and select the types of event for which the webhook has to be triggered. Workflow rules can be triggered when records are created or edited across various modules (invoices, estimates, contacts, expenses, etc.). Rules support criteria-based filtering so webhooks fire only when specific conditions are met.

- **Invoice Events**: Trigger when an invoice is created, updated, or reaches a specific status (e.g., paid, overdue).
- **Estimate Events**: Trigger when an estimate is created, edited, accepted, or declined.
- **Contact Events**: Trigger when a contact is created or edited.
- **Expense Events**: Trigger when an expense is created or updated.
- **Payment Events**: Trigger when a payment is recorded.

Webhook payloads can be sent as JSON or x-www-form-urlencoded. A maximum of 500 webhooks can be triggered per day.

**Note:** Zoho Invoice does not provide a programmatic API for registering or managing webhook subscriptions. Webhooks must be configured through the Zoho Invoice web interface as part of workflow rules.
