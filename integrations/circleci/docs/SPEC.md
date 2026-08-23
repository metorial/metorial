# CircleCI Integration Specification

## Overview

CircleCI is a continuous integration and continuous delivery (CI/CD) platform that automates building, testing, and deploying software. It integrates with version control systems like GitHub, Bitbucket, and GitLab, and provides APIs for managing pipelines, workflows, jobs, projects, and organizational settings.

## Authentication

CircleCI uses **token-based authentication** via Personal API Tokens. These tokens authenticate requests to the CircleCI API v2 and grant access according to the user's permissions.

There are two ways to pass the token:

1. **API Token Header**: You can use the token in the request header with the name `Circle-Token`. Example: `Circle-Token: <your_token>`.

2. **HTTP Basic Authentication** (deprecated): You may also use the API token as the username (Base64-encoded) with HTTP Basic Authentication. The username should be set as the circle-token value, and the password should be left blank.

**Obtaining a token:**
In the CircleCI application, go to your User settings. Select Personal API Tokens. Select Create New Token button. In the Token name field, type a memorable name for the token. Select Add API Token button. After the token appears, copy and paste it to another location. You will not be able to view the token again.

**Important notes:**

- Project tokens are currently not supported on API v2.
- The base URL for the API is `https://circleci.com/api/v2/`.
- There are no OAuth2 scopes; Personal API Tokens grant full access based on the user's permissions.

## Features

### Pipeline Management

Trigger and view pipelines for projects. The recommended trigger API supports GitHub App, GitHub OAuth, GitHub Server, Bitbucket Cloud, and Bitbucket Data Center projects; the deprecated compatibility endpoint remains available for existing calls. GitLab triggering is not supported by either API.

### Workflow Management

Retrieve details about workflows within a pipeline, including their status, jobs, and timing. You can rerun workflows, cancel running workflows, and approve pending approval jobs within a workflow.

### Job Management

Retrieve details about individual jobs, including status, executor, timing, artifacts, and test metadata. Running jobs can be cancelled by project slug and job number.

### Artifacts

List artifact paths and authenticated download URLs produced by a job.

### Project Management

Retrieve project and organization identifiers and VCS metadata. Create, list, and delete project-level environment variables.

### Contexts

Use contexts to secure and share environment variables. Create, list, get, and delete contexts by organization ID or slug, and list, set, or delete their environment variables.

### Insights

Use Insights to retrieve workflow and job summary metrics, recent workflow runs, and flaky-test details. Workflow runs going back at most 90 days are included in the aggregation window. Trends are only supported up to the last 30 days.

### Schedules

Create and manage API schedule triggers with UTC timetable fields for hours, weekdays or month days, and months. These endpoints support GitHub OAuth and Bitbucket Cloud pipeline definitions; GitHub App projects use pipeline-definition trigger endpoints instead.

### User Information

Retrieve information about the currently authenticated user and look up users by ID.

### Webhook Management (API-based)

Create, list, update, and delete outbound webhooks for projects programmatically through the API, as an alternative to configuring them via the UI.

## Events

CircleCI supports **outbound webhooks** that push event notifications to external services via HTTP POST requests.

Setting up an outbound webhook on CircleCI enables your third party service to receive information (referred to as events) from CircleCI, as they happen.

Webhooks are configured at the project level and the API requires an HTTPS receiver URL and a signing secret. Each outgoing request contains a `circleci-signature` header. The integration verifies its v1 HMAC-SHA256 signature when `webhookSigningSecret` is configured. There is a limit of 5 webhooks per project.

### Workflow Completed

A workflow in CircleCI is used to organize jobs. It defines the order in which the jobs will run and the dependencies between them. On CircleCI, a build is said to be complete when the workflow is complete. Thus, this event is triggered when all the jobs in a workflow have finished running according to the rules defined in the workflow. The payload includes workflow status (success, failed, canceled), timing, associated project, organization, pipeline, and VCS commit details.

### Job Completed

A job on CircleCI is a collection of steps. A step is a unit of work, for example, a Linux command that installs a set of dependencies. When all the steps in a job are completed, this event is triggered. The payload includes job status, timing, associated project, organization, workflow, and pipeline details. This fires for both successful and failed job completions.
