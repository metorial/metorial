Now let me get more details on the OAuth 2.0 flow and the API features:Now I have enough information to compose the specification.

# Slates Specification for BambooHR

## Overview

BambooHR is a cloud-based human resources information system (HRIS) designed for small and medium-sized businesses. It enables management, monitoring, and optimization across various HR functions, such as employee performance, employee satisfaction, recruitment, onboarding, payment, benefits, and employee vacation periods. BambooHR provides an API for its services, allowing users to programmatically access and update records on the platform, including employee and company data, reports, time tracking, goals, and tasks.

## Authentication

BambooHR supports two authentication methods. All API requests are made to `https://{companyDomain}.bamboohr.com/api/`, where `{companyDomain}` is the subdomain specific to the company (e.g., if you access `https://mycompany.bamboohr.com`, your companyDomain is `mycompany`).

### API Key (HTTP Basic Authentication)

BambooHR uses Basic Authentication where the API key serves as the username and any arbitrary string (e.g., `x`) is used as the password. To generate an API key, users should log in and click their name in the lower left-hand corner of any page to access the user context menu, where an "API Keys" option will appear if they have sufficient permissions. The API key inherits the permission set of the user who created it — if a user doesn't have access to certain fields, the API key won't have access either.

Example:

```
curl -u "{API_KEY}:x" "https://{companyDomain}.bamboohr.com/api/v1/employees/directory"
```

### OAuth 2.0 (Authorization Code Flow)

OAuth 2.0 is now supported as the primary authentication method for accessing the BambooHR API, replacing the legacy API key generation via the oidcLogin endpoint and aligning with modern security best practices. OAuth 2.0 enables support for granular scopes and token-based authentication flows.

To use OAuth 2.0:

1. Register an application in the [BambooHR Developer Portal](https://developers.bamboohr.com) to obtain a **Client ID** and **Client Secret**.
2. Configure a **Redirect URI** in the Developer Portal.
3. Direct the user to the authorization endpoint:
   ```
   https://{companyDomain}.bamboohr.com/authorize.php?request=authorize&state=new&response_type=code&scope={scopes separated by +}&client_id={clientId}&redirect_uri={redirectUri}
   ```
4. Exchange the authorization code for tokens at:
   ```
   POST https://{companyDomain}.bamboohr.com/token.php?request=token
   ```
   with `grant_type=authorization_code`, along with `client_id`, `client_secret`, `code`, and `redirect_uri`.

The `refresh_token` field will only be returned if the `offline_access` scope was provided in the original authorization request. Access tokens expire after 3600 seconds and can be refreshed using the refresh token with `grant_type=refresh_token` at the same token endpoint.

## Features

### Employee Data Management

Retrieve and manage employee information including name, email address, job title, department, personal information, job description, start date, and other job-related data. You can access individual employees by ID or retrieve employees in bulk with filtering, sorting, and field selection. Employees can be created and updated. Custom fields are supported, though fields in custom tables have some limitations.

### Employee Directory

Access company directory data including all employees' contact information and job titles. This provides a quick way to get an overview of the entire organization.

### Tabular Data

Manage employee data stored in table format (e.g., job history, compensation, education). Table rows can be added, updated, and deleted. You can filter to show only current employees or include future-dated employees.

### Time Off Management

There are two primary entities when dealing with time off: requests and history. Requests represent a request from an employee to take time off, and a request needs to be approved before it is recorded into the history. You can create, retrieve, and change the status of time off requests. You can also manage time off policies, view who's currently out, and retrieve time off balances and accrual information.

### Time Tracking

The Time Tracking API integrates directly with BambooHR timesheets. A separate Hours API exists for simply adding hours for time off accrual calculations and payroll purposes. You can manage clock-in/clock-out entries, timesheet hour entries, and time tracking projects.

### Benefits Administration

Retrieve and manage benefits information, including benefit deduction types, benefit plans, coverage details, and employee dependents.

### Reports

Generate reports on employee data, such as reports on employee turnover or performance. Both pre-defined company reports and custom reports (with user-specified fields) are supported. Reports can be generated in multiple formats (CSV, PDF, JSON, XML).

### Goals and Performance

Manage employee goals, including creating, updating, closing, and tracking progress on goals. You can view goal status counts, add comments, share goals with other employees, and align goals with organizational objectives.

### Training

Manage employee training types and records. You can create and update training types, add training records for employees, and track training completion and due dates.

### Applicant Tracking (ATS)

Manage job listings, applications, and candidate statuses. Access application details and manage the recruitment pipeline.

### Employee and Company Files

Upload, download, and manage files associated with individual employees or the company as a whole. Files can be organized into categories.

### Employee Photos

Upload and retrieve employee photos.

### Account Information

Access company-level metadata such as field definitions, list values, and table structures.

## Events

BambooHR supports webhooks to notify external services when employee data changes. There are two types of webhooks: Global Webhooks (configured by an admin in BambooHR Account Settings) and Permissioned Webhooks (created programmatically via the API, tied to the access level of the creating user).

### Employee Data Changes

Webhooks notify you when certain actions occur within your BambooHR account — when a specified event happens, like an update to employee information, BambooHR sends an HTTP POST request containing relevant data to a URL you specify.

- **Actions tracked:** Created, Updated, and Deleted actions are supported. For Created and Deleted actions, the payload contains empty changedFields; the Updated action tells consumers what fields have changed.
- **Field monitoring:** You can specify which fields to monitor and what fields to POST when those changes occur. Both standard fields and custom fields can be monitored. Fields in custom tables are not currently supported.
- **Payload configuration:** You can configure which fields will be posted by the webhook and customize field names in the payload.
- **Frequency control:** Users can specify a schedule for when webhooks should fire and limit how often a webhook will fire by setting a maximum number of requests per interval.
- **Security:** BambooHR uses a private secure key to sign webhook requests using SHA-256 HMAC, allowing your receiving application to verify that the request genuinely originated from BambooHR. BambooHR will only send webhook payloads to HTTPS URLs; HTTP is not supported.
- **Permissioned Webhooks** are managed entirely via API (create, update, delete, list, view logs). They are tied to the access level of the user who created them, meaning the webhook can only monitor fields and send data that the specific user has permission to access.
