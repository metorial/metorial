# Slates Specification for Deel

## Overview

Deel is a global payroll and compliance platform for hiring and managing international employees and contractors. It provides Employer of Record (EOR) services for hiring employees abroad, contractor management globally, and global payroll in 120+ countries. It also offers Deel IT for securely managing devices and apps.

## Authentication

Deel supports two authentication methods: **API Tokens** and **OAuth 2.0**.

### API Tokens

API tokens provide a straightforward way to authenticate server-to-server API requests. Tokens are used as bearer tokens in the Authorization header.

There are two types of API tokens:

- **Personal Tokens**: Tied to a user profile and can be used to limit API access to a user's personal access in Deel. If the profile that created the token is deleted, the token will also expire.
- **Organization Tokens**: Unlike personal tokens, organization tokens are not related to a user profile. These tokens can access all resources and do not expire if the user who created them leaves. However, contracts cannot be signed using an organization token.

Tokens are generated from the Developer Center in the Deel dashboard (More → Developer → Access Tokens tab). When creating a token, you select scopes (permissions) following the pattern `{resource}:read` or `{resource}:write` (e.g., `contracts:read`, `timesheets:write`).

Usage: Include the token as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR-TOKEN-HERE
```

Base URL: `https://api.letsdeel.com/rest/v2`

### OAuth 2.0

Deel uses OAuth 2.0's authorization code grant flow to issue access tokens on behalf of users. The OAuth2 flow is used so that clients can authorize apps to access data in their accounts.

**Setup**: Create an OAuth2 app in the Deel Developer Center (More → Developer → Apps tab). You will receive a **Client ID** and **Client Secret**. You must register a **Redirect URI**. Deel uses different credentials for Sandbox (demo.letsdeel.com) and Production (app.deel.com) environments. Ensure you are using the correct credentials for your desired environment.

There are two app types: **Organization App** (org-wide access) and **Personal App** (user-specific permissions).

**Flow**:

1. **Authorize**: Redirect users to `https://app.deel.com/oauth2/authorize` with parameters: `client_id`, `redirect_uri`, `scope` (space-separated), and `state` (CSRF protection).
2. **Callback**: User approves and is redirected to your redirect URI with an authorization `code`.
3. **Token Exchange**: POST to `https://app.deel.com/oauth2/tokens` with `grant_type=authorization_code`, the `code`, and `redirect_uri`. Authenticate via HTTP Basic with `base64(client_id:client_secret)`.
4. **API Requests**: Include both `Authorization: Bearer ACCESS_TOKEN` and `x-client-id: CLIENT_ID` headers on every request.

**Token Lifetimes**: Access tokens are valid for 30 days; refresh tokens are valid for 90 days. Refresh by POSTing to `https://app.deel.com/oauth2/tokens` with `grant_type=refresh_token`.

Scopes follow the same `{resource}:read` / `{resource}:write` pattern as API tokens. OAuth2 apps include all the available scopes, so there's no need to specify the scope when using them in some contexts like SCIM.

## Features

### Contract Management

Create, retrieve, amend, duplicate, sign, and terminate contracts. Supports multiple contract types: fixed rate, pay-as-you-go (fixed and task-based), and milestone-based contracts. EOR contract creation is also available. Contractors can be invited to sign contracts. Custom fields can be associated with contracts.

### Employer of Record (EOR)

Hire employees abroad through Deel's EOR service. Includes creating and signing EOR contracts, managing employee onboarding, handling EOR amendments, and accessing country-specific guides and cost calculators.

### Global Payroll

Run payroll in 120+ countries. Create and manage global payroll contracts. Includes time tracking capabilities for payroll employees.

### People & Worker Management

Manage workers across the organization. Access worker profiles, documents, and download worker documents. Includes candidate management for onboarding pipelines.

### Timesheets & Time Tracking

Create and manage timesheets for contractors. Submit timesheets for review (approval or denial).

### Time Off Management

Create, update, and manage time off requests. Requests go through a review workflow (approval or denial).

### Payments & Invoicing

Automate salary and invoice processing. Manage payment statements, off-cycle payments, and invoice adjustments. Adjustment categories can be configured per organization.

### Accounting

Access billing invoices, download links, and accounting-related data for financial integration purposes.

### Immigration

Global visa support through the immigration API, allowing tracking of immigration cases and process statuses.

### Deel IT (Device & App Management)

Subscribe to webhooks for events like asset created, approved, or shipped to trigger downstream actions. Manage IT orders, track asset locations, and handle device lifecycle.

### Deel Engage (Learning)

Manage learning journey assignments and reminders for employee engagement and training.

### Organization Management

Manage organizations, legal entities, groups, and managers. Includes support for child organizations (white-label use cases).

### SCIM User Provisioning

Deel SCIM API uses Organization tokens to authenticate requests. Provision and sync users between Deel and identity providers. The SCIM API doesn't currently support user groups.

### Background Checks & Compliance

KYC and AML screening. Background check results are available through the platform.

## Events

Deel Webhooks deliver real-time notifications for key platform events, allowing you to build efficient and responsive integrations without relying on constant polling. Webhooks are managed via the API or the Developer Center UI. Deel secures webhook notifications by signing each payload with an HMAC generated using SHA256 and a unique secret key that you receive when you create a webhook subscription. Unlike other API endpoints, webhook subscription endpoints do not require specific scopes.

When creating a webhook, you specify an endpoint URL, select the events to subscribe to, and choose an API version.

### Contract Events

Notifications for contract lifecycle changes: contract created, amended, duplicated, status updated, terminated, and team member invited to sign.

### Deel HR / Worker Events

Notifications when workers are created, updated, or deleted. Includes specific events for direct employees, contractors, and EOR employees being created.

### Deel HR SCIM Events

Notification when a user is created in Deel HR (for SCIM provisioning).

### Deel Engage Events

Notifications for learning journey assignment creation and reminders.

### Deel IT Events

Notifications when an IT order is created or when an asset's location is updated.

### EOR Events

Notifications for EOR quote creation and EOR amendment status updates.

### Global Payroll Events

Notification when a global payroll employee termination is confirmed.

### Immigration Events

Notification when the status of an immigration case or process changes.

### Invoice Adjustment Events

Notifications when invoice adjustments are created, reviewed (approved/denied), or pending for approval.

### OAuth2 Events

Notification when an OAuth2 token is revoked.

### Onboarding Events

Notifications for onboarding checklist and status updates.

### Payment Events

Notifications when a payment statement is initiated or marked as paid.

### Payslip Events

Notifications when EOR or global payroll payslips are available.

### Profile Events

Notification when a profile's KYC status changes.

### Timesheet Events

Notifications when timesheets are created or reviewed (approved/denied).

### Time Off Events

Notifications for time off requests being created, reviewed (approved/denied), updated, or deleted/cancelled.

### Verification Events

Notification when a background check is completed and results are available.
