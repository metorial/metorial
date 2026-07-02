Now let me get the full list of webhook event types from the Greenhouse webhook documentation.# Slates Specification for Greenhouse

## Overview

Greenhouse is an applicant tracking system (ATS) and hiring platform used for managing recruitment workflows. It provides APIs for accessing recruiting data, managing candidates and jobs, building custom career sites, ingesting candidates from external sources, and managing employee onboarding.

## Authentication

Greenhouse exposes multiple APIs, each with its own authentication approach. The primary APIs relevant for integration are:

### Harvest API (Primary Data API)

Harvest uses Basic Auth over HTTPS for authentication. The username is your Greenhouse API token and the password should be blank.

To construct the Authorization header, append a `:` (colon) to your Greenhouse API token and then Base64 encode the resulting string. The result is sent as: `Authorization: Basic <encoded_string>`.

**Obtaining a key:** A user must be granted the "Can manage ALL organization's API Credentials" in the "Developer permission" section. That user can then go Configure >> Dev Center >> API Credential Management. From there, you can create a Harvest API key and choose which endpoints it may access.

**Endpoint permissions:** You can specify which API endpoints your API keys have access to from the Greenhouse Dev Center. This will allow you to permit or deny access to each endpoint individually.

**On-Behalf-Of header:** For auditing purposes, write operations (creating, updating, and deleting resources) require an On-Behalf-Of HTTP header containing the Greenhouse ID of the user performing the operation.

**Base URL:** `https://harvest.greenhouse.io/v1/`

### Candidate Ingestion API

The Candidate Ingestion API is intended for recruiting partners, like agencies and job portals. Access is authenticated either with HTTP Basic authentication (with API key provided by Greenhouse customer), or OAuth 2.0 with granular scopes.

**OAuth 2.0 flow:** When Greenhouse receives partner registration information, they supply the partner with a consumer key, a consumer secret, a token URL, and an authorize URL. The authorize URL is `https://api.greenhouse.io/oauth/authorize`.

**OAuth scopes:** If you use OAuth for authentication, there are 3 permission scopes: `candidates.create` (create new candidates or prospects), `candidates.view` (view candidates imported via this partner), and `jobs.view` (view my jobs).

### Job Board API

The Job Board API is intended for building custom careers pages. It's publicly accessible without authentication, cached and not rate limited. It only uses HTTP Basic authentication for submitting candidates through the API.

### Onboarding API

Onboarding API can be used to query and modify your employee profiles and company information in Greenhouse Onboarding. Onboarding API is typically used to build HR integrations. Compared to a traditional REST API, Onboarding API only supports GraphQL. You're able to retrieve information using queries and use mutations to manipulate data. Onboarding API is secured with HTTP Basic Authentication over HTTPS. Clients are required to supply both a username and password.

**Base URL:** `https://onboarding-api.greenhouse.io/graphql`

## Features

### Candidate Management

Read, create, update, and delete candidate records including personal information, education, employment history, tags, and custom fields. The Harvest API provides access to most Greenhouse data and can be used to update candidate information, add attachments to candidate profiles, and advance, move, and reject applications. Supports merging duplicate candidates and anonymizing candidate data for GDPR compliance.

### Application Management

Manage the full lifecycle of candidate applications: create, retrieve, update, and delete applications. Track application status (active, rejected, hired), view current stage and interview details, and manage the progression of candidates through hiring stages.

### Job Management

Create, read, update, and manage jobs including their departments, offices, hiring teams, openings, and custom fields. Manage job stages and interview plans. Jobs can be opened, closed, and configured with approval flows.

### Job Board / Career Site

Job Board API can be used to build a custom job board or career site to post your jobs publicly for candidate applications. It is designed to export information about your public job boards and job posts so developers can build custom career and application sites. It also allows importing new candidate data via application submission.

### Offer Management

Create, retrieve, update, and delete offers associated with candidate applications. Offers support versioning, custom fields, and approval workflows. Track offer status including created, sent, accepted, rejected, and deprecated states.

### Interview & Scorecard Management

Manage scheduled interviews, interview kits, and scorecards. View interviewer assignments and feedback status. Scorecards track interview feedback and overall candidate evaluation.

### Candidate Ingestion (Sourcing)

Ingestion API can be used to source candidates and prospects from a third-party to Greenhouse Recruiting and to retrieve the stage and status of existing candidates. Designed for recruiting agencies and job portals to submit candidates programmatically.

### Prospect Management

Manage prospects (passive candidates not yet associated with a specific job application). Prospects have dedicated pools, stages, and owners, and can later be converted to active candidates.

### Organization Management

Manage organizational data including departments, offices, users, custom fields, rejection reasons, sources, job stages, and other configuration data. Manage user roles and permissions.

### Employee Onboarding

The Greenhouse Onboarding API allows you to query and modify your employee, and query company information. Access employee profiles, onboarding tasks, and company-level configuration. Requires a Greenhouse Onboarding subscription. Uses GraphQL exclusively.

### Assessment Integration

Assessment API can be used to create custom take-home test integrations including coding tests, video interviews, and personality tests. It is designed to import test options from a third-party system to Greenhouse Recruiting. When candidates reach a predetermined job stage, the third-party can be triggered to send a test to the candidate. The test status is subsequently updated when the candidate completes the assessment.

### Custom Fields

Supports extensive custom fields on candidates, applications, jobs, offers, and openings. Field types include short text, long text, boolean, single/multi select, currency, currency range, number, number range, date, URL, and user references. Custom fields on the application object are only available to customers with Enterprise-level accounts.

## Events

Greenhouse supports webhooks for real-time event notifications. A webhook is a simple event-notification system. When an event occurs in Greenhouse, a payload of JSON data containing information about the event is sent via POST to a specified endpoint URL over HTTPS. Each delivery will include a Greenhouse-Event-ID header.

Webhooks are configured in the Greenhouse Dev Center with a name, endpoint URL, and secret key. The secret key is used to generate an HMAC-SHA256 signature for payload verification.

### Application Events

Notifications for application lifecycle changes:

- **Application created** — Fired when a new candidate application is created.
- **Application deleted** — Fired when an individual application is destroyed (via API, removal from job, or merge).
- **Application updated** — Fired when an application is updated.
- **Offer created** — Fired when a new offer is created or a change creates a new version.
- **Offer approved** — Fired when an offer receives final approval.
- **Offer updated** — Fired when an offer is modified.
- **Offer deleted** — Fired when an offer is explicitly deleted.
- **Prospect created** — Fired when a new prospect application is created.

### Candidate Events

Notifications for candidate-level changes:

- **Candidate deleted** — Fired when a candidate or prospect is deleted.
- **Candidate hired** — Fired when an offer is accepted.
- **Candidate merged** — Fired when two candidate records are merged together.
- **Candidate stage change** — Fired when a candidate moves between interview stages.
- **Candidate unhired** — Fired when a hire decision is reversed.
- **Candidate/Prospect rejected** — Fired when a candidate or prospect is rejected.
- **Candidate/Prospect unrejected** — Fired when a rejection is reversed.
- **Candidate/Prospect updated** — Fired when candidate or prospect fields are modified.
- **Candidate anonymized** — Fired when a candidate's data is anonymized (e.g., for GDPR).

### Interview Events

Notifications for interview-related deletions:

- **Interview deleted** — Fired when a scheduled interview is cancelled or deleted.
- **Scorecard deleted** — Fired when an individual scorecard is destroyed.

### Job Events

Notifications for job lifecycle changes:

- **Job created** — Fired when a new job is created or copied.
- **Job deleted** — Fired when a closed job is deleted.
- **Job updated** — Fired when job fields (name, department, office, status, custom fields, etc.) change.
- **Job approved** — Fired when a job receives final approval in its approval flow. Includes the approval flow type (`open_job` or `offer_job`).
- **Job Post created/updated/deleted** — Fired when job posts or prospect posts are created, modified, or removed.
- **Job Stage deleted** — Fired when an interview stage is removed from a job.

### Organization Events

Notifications for organizational structure changes:

- **Department deleted** — Fired when a department is removed.
- **Office deleted** — Fired when an office is removed.
