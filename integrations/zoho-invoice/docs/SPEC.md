Now let me check the webhook event types available:Now I have a comprehensive understanding of Zoho Invoice. Let me note that Zoho Invoice uses workflow-based webhooks (configured through Settings > Automation > Webhooks) rather than a dedicated webhook API. The webhooks are tied to workflow rules rather than being a standalone webhook subscription API. Let me compile the specification.

# Slates Specification for Zoho Invoice

## Overview

Zoho Invoice is an online invoicing application that allows businesses to create and manage invoices, estimates, expenses, and projects. It supports multi-currency transactions, time tracking, customer and contact management, recurring invoices, credit notes, and customer payments. Zoho Invoice is part of Zoho's broader suite and shares infrastructure with Zoho Billing.

## Authentication

Zoho Invoice uses the OAuth 2.0 protocol to authorize and authenticate API calls.

### Setup

1. Register your application at Zoho's Developer Console (https://accounts.zoho.com/developerconsole) to obtain a Client ID and Client Secret.

2. **Authorization Endpoint:** `https://accounts.zoho.com/oauth/v2/auth` — Redirect the user here with the required parameters (`scope`, `client_id`, `response_type=code`, `redirect_uri`, and optionally `access_type=offline` for refresh tokens).

3. **Token Endpoint:** `https://accounts.zoho.com/oauth/v2/token` — Exchange the authorization code for an access token and refresh token using `grant_type=authorization_code`.

4. **Refresh Token Endpoint:** Same as token endpoint, using `grant_type=refresh_token` to obtain a new access token when the current one expires.

5. **Revoke Endpoint:** `https://accounts.zoho.com/oauth/v2/token/revoke?token={token}`

### Regional Data Centers

There are 8 different domains for Zoho Invoice's APIs, and you must use the one applicable to your organization. The OAuth and API base URLs vary by region:

| Region               | OAuth Domain          | API Domain          |
| -------------------- | --------------------- | ------------------- |
| United States (.com) | accounts.zoho.com     | www.zohoapis.com    |
| Europe (.eu)         | accounts.zoho.eu      | www.zohoapis.eu     |
| India (.in)          | accounts.zoho.in      | www.zohoapis.in     |
| Australia (.com.au)  | accounts.zoho.com.au  | www.zohoapis.com.au |
| Japan (.jp)          | accounts.zoho.jp      | www.zohoapis.jp     |
| Canada (.ca)         | accounts.zohocloud.ca | www.zohoapis.ca     |

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

### Token Notes

- The access token expires after a limited period (typically 1 hour).
- The refresh token is permanent and is used to regenerate new access tokens.
- The maximum limit is 20 refresh tokens per user. If this limit is crossed, the first refresh token is automatically deleted.

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
