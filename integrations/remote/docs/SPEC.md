Now let me get the available webhooks list:I now have comprehensive information from the API reference page and documentation. Let me compile the specification.

# Slates Specification for Remote

## Overview

Remote is a global HR platform that enables companies to hire, manage, and pay employees and contractors in countries around the world without establishing local entities. It provides Employer of Record (EOR) services, global payroll, contractor management, benefits administration, and compliance handling through a unified platform.

## Authentication

Remote supports two authentication approaches depending on whether you are a **direct customer** or a **partner/integration builder**.

### For Customers: API Token (Bearer Token)

The Remote API uses a bearer token for Authentication and Authorization. Only company admin or company owner can create and revoke the API token.

To generate a token:

1. On the Remote dashboard, go to Company → Company Settings → Integrations & APIs → Integrations, then click on the Remote API card and click the Generate API token button.
2. The token is passed in the `Authorization` header as a Bearer token.

The prefix of the access token changes according to the environment: `ra_live` tokens are for production use, while `ra_test` tokens work only in the sandbox environment.

- **Production base URL:** `https://gateway.remote.com`
- **Sandbox base URL:** `https://gateway.remote-sandbox.com`

### For Partners: OAuth 2.0

The Remote API uses the OAuth 2 protocol for authorization, meaning every request needs a valid access token for it to succeed. Access tokens are valid for 3600 seconds (one hour).

Two OAuth 2.0 flows are supported:

1. **Client Credentials Flow:** The Remote API Partner authenticates using their `CLIENT_ID` and `CLIENT_SECRET`. All actions are made on behalf of the Remote API Partner. This flow allows creating new companies and managing companies that have granted consent.

2. **Authorization Code Flow (for existing companies):** Used when the Partner wants to manage an existing Remote company's data (e.g., create employments, time-offs). The existing Remote Company grants consent to the Partner for acting on behalf of the user who authorized the integration. Any Company Admin can give consent.

A Refresh Token Flow is available because the access token expires in one hour. After expiration, issuing a new access token through the Refresh Token Flow is required.

**Token endpoint:** `POST /oauth2/token`

## Features

### Company Management

Create, view, and update companies on the Remote platform. Manage company settings, departments, legal entities, compliance profiles, supported currencies, and company managers. Partners can create new companies programmatically and manage pricing plans.

### Employment Lifecycle (EOR)

Create and manage employee records for Employer of Record services. This covers the full lifecycle:

- **Onboarding:** Create employments with country-specific fields (via JSON schemas), invite employees to complete onboarding, track onboarding steps and tasks, and cancel onboarding if needed.
- **Employment updates:** Update employee personal information, administrative details, employment details, and work email. Track employment and user statuses.
- **Identity verification:** View and manage employee identity verification.
- **Probation management:** Extend probation periods and issue probation completion letters.

Employment creation requires country-specific data governed by dynamic JSON schemas that vary by country.

### Offboarding

Initiate and manage employee offboarding (termination) requests. View offboarding status, download resignation letters, and validate resignation requests. Track contract termination dates.

### Contract Amendments

Create and manage contract amendments for existing employments. View amendment schemas per country, track amendment review statuses (submitted, reviewed, done, canceled).

### Contractor Management

Manage contractor relationships including:

- Create and manage Contractor of Record (COR) subscriptions and Contractor Plus subscriptions.
- View contractor invoices and manage recurring invoice schedules.
- Create and sign contract documents for contractors.
- Submit eligibility questionnaires for contractor classification.

### Time Off Management

Create, approve, decline, and cancel time off requests. View time off types and balances per employment. Supports managing cancellation requests for already-approved time off. Leave policies (details and summaries) can be retrieved per country/employment.

### Payroll

View payroll calendars (both company-level and EOR-level), payroll runs, and employee payroll details. Download payslips in PDF format. Supports both listing and individual payslip retrieval.

### Incentives

Create and manage one-time and recurring incentives (bonuses, commissions, etc.) for employees. Incentives can be created, updated, and deleted before processing.

### Expenses

Create, view, update, approve, decline, and reimburse employee expenses. Download expense receipts. View expense categories.

### Timesheets

List and view employee timesheets. Approve timesheets or send them back for review/modification.

### Benefits

View available benefit offers by country and employment. Upsert employment benefit selections using country-specific JSON schemas. Manage benefit renewal requests.

### Documents & Files

Upload, list, and download employment-related files and documents. Access employee documents and contract documents.

### Cost Calculator

Estimate employment costs by country before hiring. Generate cost estimations in JSON, CSV, or PDF formats. Supports region-specific field configuration.

### Country Information

List supported countries with their specific requirements, holidays, contractor contract details, and country-specific form schemas for employment creation.

### Travel Letters & Work Authorization

Manage travel letter requests and work authorization requests for employees, including approval workflows by both managers and Remote.

### Custom Fields

Define custom field definitions and manage custom field values for employments, enabling companies to store additional structured data on employee records.

### SSO Configuration

Configure and manage Single Sign-On (SSO) settings for a company.

### SCIM Provisioning

List and retrieve users and groups via SCIM v2.0 for directory synchronization with identity providers.

### Billing

List, view, and download billing documents and their breakdowns in PDF format.

### Currency Conversion

Convert amounts between currencies using either dynamic rates (with spread) or flat rates, useful during onboarding and cost estimation.

## Events

Webhooks are a way of getting automatically notified of events occurring in the system. The webhook workflow is automated, so subscribing to one will notify you of changes without having to poll the API.

Managing webhooks requires a company-scoped access token, as webhooks are always tied to individual companies. There is currently no support for global or partner-level webhooks outside of a specific company context.

You register a webhook callback URL with one or more subscribed event types. Remote allows you to verify the authenticity of a webhook request using cryptographically-signed signatures. When you register a webhook callback URL, the response includes a `signing_key`. The webhooks API provides an option to replay previously triggered webhooks at any time, which is useful if you notice failed webhook deliveries.

### Employment Events

Track changes across the employment lifecycle: onboarding started/completed/cancelled, onboarding task completed, employment details updated, personal information updated, status changes, user status changes (activated, deactivated, initiated, invited), start date changed, work email updated, employment agreement available, and EOR hiring milestones (invoice created, proof of payment submitted/accepted).

### Offboarding Events

Notifications when offboarding requests are submitted, under review, submitted to payroll, completed, or deleted. Also includes contract termination date reached events.

### Contract Amendment Events

Events for when contract amendments are submitted, review started, done, canceled, or deleted. Also includes active contract updates and contract adjustments during onboarding.

### Time Off Events

Events for time off requested, approved, declined, cancelled, date changed, taken, started, updated, and cancellation requested.

### Expense Events

Events for expenses created, submitted, approved, declined, reimbursed, updated, and deleted.

### Incentive Events

Events for incentives created, updated, deleted, processing started, and paid.

### Payslip Events

Notification when a payslip is released for an employee.

### Company Events

Events for company activated, archived, manager created/updated/deleted, partner offboarded, pricing plan updated, and EOR hiring milestones (additional information required, reserve payment requested, verification completed, referred).

### Timesheet Events

Notification when a timesheet is submitted.

### Billing Events

Notification when a billing document is issued.

### SSO Configuration Events

Events for SSO configuration enabled, disabled, and updated.

### Probation Events

Events for probation period ending reminder, probation extensions (submitted, completed, cancelled), and probation completion letters (submitted, completed, cancelled).

### Identity Verification Events

Notification when identity verification is required for an employee.

### Travel Letter Events

Events for travel letters requested, approved/declined by manager, and approved/declined by Remote.

### Work Authorization Events

Events for work authorization requested, approved/declined by manager, approved/declined by Remote, and cancelled.

### Custom Field Events

Notification when a custom field value is updated.

### Benefit Renewal Events

Notification when a benefit renewal request is created.

### Contract Document Events

Notification when a contract document status changes.

### Employment Company Structure Events

Notification when an employment's company structure node is updated.
