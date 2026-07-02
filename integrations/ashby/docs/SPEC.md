Let me get the full list of webhook types from the API reference.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Ashby

## Overview

Ashby is an applicant tracking system (ATS) and recruiting platform that helps companies manage their hiring pipelines. It provides tools for candidate management, job postings, interview scheduling, offers, and hiring team collaboration. The API enables programmatic access to recruiting data and automation of hiring workflows.

## Authentication

Ashby uses **HTTP Basic Authentication** with API keys.

- Use HTTP Basic Auth to authenticate with the API. You must send your API key with every request.
- All endpoints use Basic authentication, meaning requests must include an `Authorization: Basic <base64(your_api_key + ":")>` header. If using a GUI like Postman, supply the API key as the username and leave the password field blank.

**Generating an API key:** Log in to your Ashby admin dashboard, navigate to Developer Settings, and generate a new API key.

**Permissions:** Each API key has a set of permissions that determine which endpoints it can read or write. If your API key does not have the necessary permissions to access an endpoint, the API will respond with a 403 status code. API permissions are organized by module.

The permission modules are: **Jobs**, **Candidates**, **Interviews**, **Hiring Process**, **Organization**, **Offers**, **API Keys**, **Approvals**, and **Reports**. Each module can be granted independent read and/or write access.

Additionally, there are two special permissions that can be toggled:

- **Confidential Job and Project Access** — allows access to confidential job/project data and their candidates.
- **Private Fields Access** — allows access to private fields on candidates (excluding offers, which are accessible by default).

Note: Because this API uses a long-lived key, it is not recommended for use in browsers.

## Features

### Candidate Management

Create, update, search, and list candidates. Add tags, notes, and files to candidate profiles. Upload resumes, anonymize candidates, and manage candidate projects. Requires the `candidatesRead`/`candidatesWrite` permissions.

### Application Management

Create and track applications through the hiring pipeline. Change application stages and sources, transfer applications between jobs, manage hiring team members on applications, view application history, and submit application forms. Feedback can be submitted and listed per application.

### Job Management

Create and manage jobs, including setting job status, updating compensation details, and searching jobs. Manage job postings (publish/unpublish, update content) and job boards. Supports job templates and job interview plan configuration.

### Openings

Create and manage openings (headcount). Associate openings with jobs and locations, set opening states, and archive/restore openings.

### Interview Management

List and view interviews, interview events, interview plans, interview stages, and interview stage groups. Create, update, and cancel interview schedules with specific time slots and interviewers. Manage interviewer pools (create, update, add/remove users, archive/restore).

### Offer Management

Create, update, approve, and start offers. Start offer processes and list/view existing offers.

### Organization Management

Manage departments (create, archive, restore, move, update) and locations (create, archive, update address/name/remote status/workplace type). List and search users, and manage user interviewer settings. Manage hiring team membership at the job level.

### Custom Fields

Create custom field definitions and set custom field values on various entities.

### Hiring Process Configuration

Access archive reasons, close reasons, candidate tags, communication templates, sources, source tracking links, feedback form definitions, survey form definitions, and referral forms. Create candidate tags.

### Surveys

Create survey requests, list survey submissions, and submit survey responses. Survey URLs can be generated and shared with candidates.

### Assessments

Add completed assessments to candidates and update assessment statuses. Ashby also supports a partner-implemented assessment integration where Ashby calls your endpoints to start, list, and cancel assessments.

### Referrals

Create referrals and access referral form definitions.

### Approvals

List approvals and update approval definitions.

### Reports

Generate reports asynchronously or synchronously.

## Events

Webhooks allow for real-time integration with Ashby's platform, enabling automated responses to events like candidate status changes, job posting updates, or interview scheduling.

Webhooks can be configured via the Ashby Admin panel or programmatically via the API. You can configure different URLs for different webhooks, or create multiple webhooks for the same event to "fan out" requests to different URLs. You can provide a secret token that will be used by Ashby to cryptographically sign all webhook requests. The signature will be sent with the request in an Ashby-Signature HTTP header. By computing a digest of the payload using your secret token, you can compare it to the signature sent with the request to verify authenticity.

### Application Events

- **applicationSubmit** — Triggered when a new application is submitted.
- **applicationUpdate** — Triggered when an application is updated.

### Candidate Events

- **candidateHire** — Triggered when a candidate is hired.
- **candidateStageChange** — Triggered when a candidate moves to a different interview stage. Also triggers a related `applicationUpdate` webhook.
- **candidateDelete** — Triggered when a candidate is deleted.
- **candidateMerge** — Triggered when two candidate records are merged.

### Interview Events

- **interviewPlanTransition** — Triggered when a candidate transitions within an interview plan.
- **interviewScheduleCreate** — Triggered when an interview schedule is created.
- **interviewScheduleUpdate** — Triggered when an interview schedule is updated.

### Job Events

- **jobCreate** — Triggered when a new job is created.
- **jobUpdate** — Triggered when a job is updated.

### Job Posting Events

- **jobPostingUpdate** — Triggered when a job posting is updated.
- **jobPostingPublish** — Triggered when a job posting is published.
- **jobPostingUnpublish** — Triggered when a job posting is unpublished.

### Offer Events

- **offerCreate** — Triggered when an offer is created.
- **offerUpdate** — Triggered when an offer is updated.
- **offerDelete** — Triggered when an offer is deleted.

### Opening Events

- **openingCreate** — Triggered when an opening is created.

### Other Events

- **pushToHRIS** — Triggered when a candidate's data is pushed to an HRIS system.
- **surveySubmit** — Triggered when a survey is submitted.
- **signatureRequestUpdate** — Triggered when a signature request is updated.
- **ping** — A test webhook sent when a webhook is created or edited to verify the endpoint.

Some actions trigger other, related webhooks. For example, when a candidateStageChange event occurs, it also triggers an applicationUpdate webhook. These webhooks are generated with the same webhookActionId to indicate they represent the same underlying event.
