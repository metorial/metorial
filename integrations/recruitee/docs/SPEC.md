Now let me get more details on the ATS API features:Now I have enough information to write the specification.

# Slates Specification for Recruitee

## Overview

Recruitee (now part of Tellent) is a collaborative hiring platform that provides applicant tracking (ATS), employer branding, job promotion, talent sourcing, and candidate management. It offers APIs for managing the full recruitment pipeline including candidates, job offers, talent pools, and careers site content.

## Authentication

Recruitee uses **Personal API Tokens** (Bearer tokens) for authentication.

### Generating a Token

1. Log in to your Recruitee account.
2. Navigate to **Settings > Apps and Plugins > Personal API Tokens**.
3. Click **+ New Token** to generate a new token.

Tokens do not expire unless explicitly revoked by the user.

### Using the Token

All API requests require two pieces of information:

- **Company ID**: A numeric identifier for your Recruitee company account, included in the API URL path (e.g., `https://api.recruitee.com/c/{COMPANY_ID}/...`).
- **API Token**: Passed via the `Authorization: Bearer {token}` header.

Example:

```
GET https://api.recruitee.com/c/12345/candidates
Authorization: Bearer your_api_token_here
```

There is also a separate **Careers Site API** that provides public, unauthenticated access to published job offers and the ability to submit candidate applications. This API uses the company's subdomain slug rather than a company ID.

### Partners API

For integration partners, Recruitee provides a separate Partners API with its own authentication. A `partner.secret` is generated for each registered partner and gives access to partner-specific endpoints (e.g., reports). For access to the broader Recruitee API, partners must obtain a Personal API Token from each customer.

## Features

### Candidate Management

Create, read, update, delete, and search for candidates. Includes managing candidate profile data (name, emails, phones, source, photo), uploading/updating CVs, and retrieving candidate notes. Candidates can be searched by various criteria including name and email. Custom fields can be set on candidate profiles.

### Job & Talent Pool Management

Create, read, update, and delete job offers and talent pools. Jobs include properties such as title, description, department, locations, tags, and status (draft/published/archived). Talent pools follow a similar structure.

### Candidate Pipeline Management

Assign candidates to jobs or talent pools, move them through pipeline stages (e.g., Applied, Phone Screen, Interview, Offer, Hired), disqualify with reasons, and requalify candidates.

### Careers Site API

A public-facing API (no authentication required) that allows fetching published job listings and submitting candidate applications programmatically. Useful for building custom careers pages on external websites.

### Locations & Departments

Retrieve available office locations and departments configured in the company account, useful for filtering and organizing job offers.

### File Attachments

Upload file attachments (e.g., resumes, cover letters) to associate with candidates.

### Candidate Custom Fields

Set and manage custom field values on candidate profiles, allowing storage of company-specific data points.

### Partners Integration

For integration partners: register as a partner, send candidate data from external sources into Recruitee, and manage assessment/screening reports attached to candidates. Also supports job campaign analytics reporting.

### Audit Logs

Access audit logs to track changes and actions performed within the Recruitee account.

### XML Job Feed

An XML feed of published job offers is available for distribution to job boards and partner sites.

## Events

Recruitee supports **webhooks** that send HTTP POST requests to a configured HTTPS endpoint when events occur. Webhooks are configured under **Settings > Apps and Plugins > Webhooks** and can be verified using an HMAC-SHA256 signature provided in the `X-Recruitee-Signature` header.

### Candidate Created

Fires when a new candidate applies or is manually created. Includes subtypes indicating how the candidate was created: via email, career site, manually, or imported.

### Candidate Assigned

Fires when a candidate (new or existing) is assigned to a job or talent pool. Includes the offer and placement location details.

### Candidate Pipeline Change

Fires when a candidate is moved to a different pipeline stage, disqualified, or requalified. Subtypes: `stage_changed`, `disqualified`, `requalified`. Includes details about the origin and destination stages, or the disqualification reason.

### Candidate Deleted

Fires when a candidate is deleted from the system.

### Job Published

Fires when a job offer is published and made publicly visible.

### Job Unpublished

Fires when a job offer is unpublished or archived.

### Job Updated

Fires when a job offer is updated. Subtypes indicate the nature of the change: `offer_changed`, `status_changed`, or `tags_changed`.
