Now let me get the specific webhook event types from the Workable API docs:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Workable

## Overview

Workable is a talent acquisition and HR platform that provides applicant tracking (ATS), recruiting, and employee management capabilities. It allows companies to manage job postings, track candidates through hiring pipelines, and handle employee data and time-off requests. The API (currently v3) exposes recruiting and HR data for integration with external systems.

## Authentication

Workable supports three authentication methods:

### 1. API Access Token (API Key)

You can access, manage, and extract recruiting data from your Workable account by generating API access tokens. To generate or revoke access tokens for your account, you must be an Admin user in Workable.

- Navigate to **Settings > Integrations > Apps** and click "Generate new token."
- Add a name for your token, select the token's expiration from the dropdown (available options: 30 days, 90 days, 6 months, 1 year, 2 years), and select which scope(s) will be enabled for this token.
- The token is passed as a Bearer token in the `Authorization` header.
- Workable requires a user-specific subdomain for the API base URL. The base URL format is `https://{subdomain}.workable.com/spi/v3/`.

Available scopes include:

- `r_jobs` — Read access to jobs
- `r_candidates` — Read access to candidates
- `w_candidates` — Write access to candidates
- `r_employees` — Read access to employees

Scopes prefixed with `r_` grant read access, while `w_` grants write access.

### 2. OAuth 2.0 (Authorization Code Flow)

Official partners can access Workable API endpoints through OAuth 2.0, utilizing the Authorization Code flow. In this scenario the Partner should be authorized beforehand by Workable and get a `client_id` and `client_secret` which he should use for onboarding users.

- **Authorization URL:** `https://www.workable.com/oauth/authorize`
- **Token URL:** `https://www.workable.com/oauth/token`
- **Revoke URL:** `https://www.workable.com/oauth/revoke`
- Scopes are specified in the authorization URL, e.g., `scope=r_jobs+r_candidates+w_candidates`.
- The refresh token flow returns a new pair of `access_token` and `refresh_token`. Access tokens expire after 7200 seconds (2 hours).
- OAuth credentials (`client_id` and `client_secret`) must be obtained by applying to become an official Workable partner.

### 3. Partner Token

The Partner Token is an authorization token used specifically for an integration. Unlike the Access Token, the Partner Token allows you to only use the endpoints associated with the scopes your application needs. Partner tokens are only available to official Workable partners.

## Features

### Account & Team Management

Retrieve account information, list and manage hiring team members (with roles and permissions), manage recruiters, and view pipeline stages. You can also manage requisition data including fields, approval status, and workflow. Admins can invite members, update access levels, and deactivate or restore members.

### Job Management

Access job listings with details such as title, department, location, state (draft, published, closed, archived), and salary. Retrieve job-specific application forms, custom questions, custom attributes, pipeline stages, and assigned team members. Jobs can be filtered by state, creation date, and update date.

### Candidate Management

Manage your candidates by fetching candidates, extracting detailed candidate info, creating candidates, and updating candidates. Perform actions such as copying candidates between jobs, relocating, moving between stages, disqualifying, and reverting disqualification. Add comments, ratings, and tags to candidate profiles. Answers to custom questions and custom fields are included in candidate detail responses.

### Requisition Management

Create, update, list, approve, and reject requisitions. Requisitions support custom fields and workflow-based approval processes.

### Offer Management

Retrieve offer details for candidates and approve or reject offers through the API.

### Department Management

Create, merge, or delete departments. List departments and legal entities associated with the account.

### Employee Management (HR)

List employees, get information about a specific employee, create a specific employee, update a specific employee, and get documents about a specific employee. Manage employee fields and upload employee documents. Access work schedules configured for the account.

### Time Off Management

Retrieve time-off categories, create and list time-off requests, and view time-off balances for employees.

### Scheduled Events

Retrieve a collection of scheduled events (e.g., interviews). Optional query parameters include type, candidate_id, job shortcode, member_id, date range, and context. The response includes event details such as title, description, type, start/end times, cancellation status, associated job, members, candidate, and conference details.

### Activity Feeds

Retrieve activity logs for both jobs and individual candidates, providing an audit trail of actions taken during the recruiting process.

### Custom Careers Page

Build a custom careers page using Workable's API by fetching job listings and displaying them on your website. Public endpoints are available that don't require authentication for listing published jobs, locations, and departments.

## Events

Workable supports webhook subscriptions for real-time event notifications. You can subscribe to an event and Workable will notify you when it's triggered. Use the subscriptions endpoint to register your endpoint. You can further filter by job and/or stage. This filtering applies only to candidate-related events.

Webhook requests are signed using HMAC SHA256, with the signature sent in the `X-Workable-Signature` header.

### Candidate Events

- **Candidate Created** (`candidate_created`): Triggered when a new candidate is added. Can be filtered by specific job and/or stage.
- **Candidate Moved** (`candidate_moved`): Triggered when a candidate moves to a different stage in the pipeline. Can be filtered by specific job and/or stage (e.g., subscribe only to movements into the "hired" stage).

The payload includes the full candidate object at the time of the webhook delivery.

### Employee Events

- **Employee Created** (`employee_created`): Triggered when a new employee record is created.
- **Employee Updated** (`employee_updated`): Triggered when an employee record is updated.
- **Employee Published** (`employee_published`): Triggered when an employee profile is published.
- **Onboarding Completed** (`onboarding_completed`): Triggered when an employee completes the onboarding process.

### Time Off Events

- **Timeoff Updated** (`timeoff_updated`): Triggered when a time-off request is updated for an employee.
