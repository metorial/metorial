Now I have comprehensive information from the official Lever documentation. Let me compose the specification.

# Slates Specification for Lever

## Overview

Lever is an applicant tracking system (ATS) and candidate relationship management (CRM) platform used for sourcing, nurturing, interviewing, and hiring talent. It draws the entire team together to source, nurture, interview, and hire top talent. Lever is candidate-centric, meaning that candidates can exist in the system without being applied to a specific job posting.

## Authentication

Lever supports two authentication methods:

### 1. API Key (Basic Auth)

API Keys are used by customers to build internal workflows. Integrations are built using OAuth authentication. Authenticate to the Lever API via basic auth by providing an API key as the username and leaving the password blank.

- Create and manage API keys from the Integrations and API page in Settings of your Lever account, on the API Credentials tab.
- API keys can be scoped to specific endpoints and optionally granted access to confidential data.
- Confidential data is accessible via the API only if the API key in use has been granted access to confidential data. This access may only be granted during key creation.
- Base URL: `https://api.lever.co/v1`

### 2. OAuth 2.0 (Authorization Code Grant)

OAuth is a requirement of the integrations program, and for that reason Lever does not provide API Keys for development. All partner integrations must use OAuth.

**Endpoints:**

- Authorization URL: `https://auth.lever.co/authorize`
- Token URL: `https://auth.lever.co/oauth/token`
- Sandbox Authorization URL: `https://sandbox-lever.auth0.com/authorize`
- Sandbox API URL: `https://api.sandbox.lever.co/v1`

**Required Parameters for Authorization:**

- `client_id` — Provided when registering the application with Lever
- `redirect_uri` — Must exactly match the registered callback URI
- `response_type` — Must be `code`
- `state` — A unique token for CSRF protection
- `audience` — Must be `https://api.lever.co/v1/` (production) or `https://api.sandbox.lever.co/v1/` (sandbox)
- `scope` — Space-separated list of required scopes; include `offline_access` to receive a refresh token

**Token Lifecycle:**

- Access tokens expire after 1 hour.
- The access token will expire, but the customer does not need to re-authenticate your app. You will simply use the refresh token to exchange for a new access token and a new refresh token. Repeat this process, factoring in expiry times for the access token and the refresh token, to maintain persistent authentication.
- Refresh tokens expire after 1 year or after 90 days of inactivity.

**Scopes:**

Scopes follow the pattern `resource:permission:admin`. Write scopes include all read permissions for that resource. Available scopes include:

| Scope                                                              | Description                         |
| ------------------------------------------------------------------ | ----------------------------------- |
| `offline_access`                                                   | Required to receive a refresh token |
| `applications:read:admin`                                          | View all opportunity applications   |
| `archive_reasons:read:admin`                                       | View all archive reasons            |
| `audit_events:read:admin`                                          | View all audit events               |
| `confidential:access:admin`                                        | Access all confidential data        |
| `contact:read:admin` / `contact:write:admin`                       | View / manage opportunity contacts  |
| `diversity_surveys:read:admin`                                     | View all diversity surveys          |
| `eeo_responses:read:admin`                                         | View EEO responses (without PII)    |
| `eeo_responses_pii:read:admin`                                     | View EEO responses (with PII)       |
| `feedback:read:admin` / `feedback:write:admin`                     | View / manage feedback forms        |
| `feedback_templates:read:admin` / `feedback_templates:write:admin` | View / manage feedback templates    |
| `files:read:admin` / `files:write:admin`                           | View / manage files                 |
| `forms:read:admin` / `forms:write:admin`                           | View / manage profile forms         |
| `form_templates:read:admin` / `form_templates:write:admin`         | View / manage form templates        |
| `interviews:read:admin` / `interviews:write:admin`                 | View / manage interviews            |
| `notes:read:admin` / `notes:write:admin`                           | View / manage notes                 |
| `offers:read:admin`                                                | View all offers                     |
| `opportunities:read:admin` / `opportunities:write:admin`           | View / manage opportunities         |
| `panels:read:admin` / `panels:write:admin`                         | View / manage interview panels      |
| `postings:read:admin` / `postings:write:admin`                     | View / manage job postings          |
| `referrals:read:admin`                                             | View all referrals                  |
| `requisitions:read:admin` / `requisitions:write:admin`             | View / manage requisitions          |
| `requisition_fields:read:admin` / `requisition_fields:write:admin` | View / manage requisition fields    |
| `resumes:read:admin`                                               | View all resumes                    |
| `sources:read:admin`                                               | View all sources                    |
| `stages:read:admin`                                                | View all stages                     |
| `tags:read:admin`                                                  | View all tags                       |
| `uploads:write:admin`                                              | Manage file uploads                 |
| `users:read:admin` / `users:write:admin`                           | View / manage users                 |
| `webhooks:read:admin` / `webhooks:write:admin`                     | View / manage webhooks              |

There is a maximum of 20 scopes per application.

## Features

### Opportunity & Candidate Management

Manage candidates through their hiring pipeline. Lever is candidate-centric: a "Contact" represents a unique individual, while "Opportunities" represent each candidacy for a specific role. You can create, retrieve, list, and update opportunities including their stage, archived state, tags, sources, and links. Opportunities can be filtered by tags, email, origin, stage, posting, archive status, and date ranges. Candidates are automatically deduplicated based on email address.

### Job Postings

Create, update, and list job postings with states including published, internal (unlisted), closed, draft, pending, and rejected. Postings include job descriptions, requirements lists, categories (team, department, location, commitment), salary ranges, distribution channels (public/internal job sites), and workplace type (onsite, remote, hybrid). You can also retrieve the custom application questions for any posting and submit applications on behalf of candidates.

### Interview Scheduling

Manage interview panels and individual interviews for opportunities. Panels group a series of interviews for a candidate in a pipeline stage. You can create, update, and delete interviews and panels, assign interviewers with specific feedback templates, and set feedback reminder frequencies. Only externally managed panels (created via API) can be modified through the API.

### Feedback & Forms

Create and manage interview feedback forms, profile forms, and their templates. Feedback forms support various field types (score, scorecard, text, dropdown, multiple choice, code, etc.). Profile forms capture additional candidate information. Templates can be created and managed for both feedback and profile forms.

### Offers

View offer details for opportunities including status (draft, sent, signed, etc.), compensation fields, custom fields, signature tracking, and sent/signed document downloads.

### Requisitions

Create, update, and delete hiring requisitions to sync with HRIS systems. Requisitions include headcount tracking, compensation bands, custom fields, approval workflows, and associations to job postings. Custom requisition field schemas can be managed via the API. Requires API-management of requisitions to be enabled by a Super Admin.

- Custom fields are validated against account-level requisition field schemas.

### User Management

Create, list, update, deactivate, and reactivate users. Users have access roles (Super Admin, Admin, Team Member, Limited Team Member, Interviewer). Supports external directory ID mapping for HRIS integration.

### Contacts

View and update contact information (name, headline, location, emails, phones) for individuals across their opportunities. Contacts are shared across all of an individual's opportunities.

### Archive Reasons & Stages

List pipeline stages and archive reasons configured in your account. Archive reasons distinguish between hired and non-hired dispositions.

### Sources & Tags

List all candidate sources and tags in your account along with their usage counts.

### Resumes & Files

Retrieve, list, and download resumes (with parsed data including positions and education) and files attached to opportunities. Upload files to opportunities on behalf of users.

### EEO & Diversity Surveys

Retrieve equal employment opportunity (EEO) responses with or without personally identifiable information. Retrieve diversity surveys associated with specific postings or candidate locations.

### Audit Events

List security-related audit events tracking user provisioning, authentication, data exports, API key management, and permission changes. This is an enterprise add-on feature.

### Referrals

View referral forms associated with opportunities, including referrer information and custom form fields.

## Events

Lever supports webhooks that send HTTP POST requests to configured HTTPS endpoints when specific events occur. Webhooks can be configured via the Lever settings UI or programmatically via the API. Webhook requests include a signature for authenticity verification using HMAC-SHA256. Only HTTPS endpoints are supported.

### Application Created

Triggers when a candidate application is created in Lever. Includes the application ID, opportunity ID, and contact ID. Can be configured with origin conditions (applied, sourced, referred, university, agency, internal).

### Candidate Hired

Triggers when a candidate is marked as hired. Includes the opportunity ID and contact ID. Can be configured with origin conditions.

### Candidate Stage Change

Triggers when a candidate moves from one pipeline stage to another. Includes the from/to stage IDs, opportunity ID, and contact ID. Can be configured with origin conditions.

### Candidate Archive State Change

Triggers when a candidate is archived or unarchived. Includes the previous and updated archive state (with timestamp and reason), opportunity ID, and contact ID. Can be configured with origin conditions.

### Candidate Deleted

Triggers when a candidate is deleted. Includes the opportunity ID, contact ID, and the user who performed the deletion. Cannot be configured with conditions.

### Interview Created

Triggers when an interview is created. Includes the interview ID, panel ID, opportunity ID, and creation timestamp. Cannot be configured with conditions. (Beta)

### Interview Updated

Triggers when an interview is updated. Includes the interview ID, panel ID, opportunity ID, and update timestamp. Cannot be configured with conditions. (Beta)

### Interview Deleted

Triggers when an interview is deleted. Includes the interview ID, panel ID, opportunity ID, and deletion timestamp. Cannot be configured with conditions. (Beta)

### Contact Created

Triggers when a contact is created. Includes the contact ID, creation timestamp, and account ID. Cannot be configured with conditions.

### Contact Updated

Triggers when a contact is updated. Includes the contact ID, update timestamp, and account ID. Cannot be configured with conditions.
