Let me get more details on the full API v2 reference to understand all features.# Slates Specification for CircleCI

## Overview

CircleCI is a continuous integration and continuous delivery (CI/CD) platform that automates building, testing, and deploying software. It integrates with version control systems like GitHub, Bitbucket, and GitLab, and provides APIs for managing pipelines, workflows, jobs, projects, and organizational settings.

## Authentication

CircleCI uses **token-based authentication** via Personal API Tokens. These tokens are used to interact with the CircleCI APIs (v1 and v2), and grant full read and write permissions.

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

Trigger, view, and manage pipelines for projects. One of the benefits of the CircleCI API v2 is the ability to remotely trigger pipelines with parameters. You can specify a branch, tag, or git revision, and pass custom pipeline parameters to control which workflows run and how they behave.

### Workflow Management

Retrieve details about workflows within a pipeline, including their status, jobs, and timing. You can rerun workflows, cancel running workflows, and approve pending approval jobs within a workflow.

### Job Management

Retrieve details about individual jobs, including their status and steps. You can cancel running jobs and retrieve test metadata associated with a job.

### Artifacts

List the artifacts produced by a given build. Download artifacts generated during job execution, such as build outputs, test reports, and other files stored during a pipeline run.

### Project Management

CircleCI has released new API v2 endpoints that help in the automated creation and configuration of projects through the API v2. Retrieve project information, manage project-level environment variables, manage checkout keys, and configure project settings.

### Contexts

Use contexts to secure and share environment variables. Create, list, and delete contexts for an organization. Manage environment variables within contexts, and configure project or expression restrictions on contexts.

### Insights

Use Insights to monitor credit and compute usage for your projects. Get summary metrics and trends for a project at workflow and branch level. Workflow runs going back at most 90 days are included in the aggregation window. Trends are only supported up to last 30 days. View job-level timeseries data and flaky test detection.

### Schedules

Create and manage scheduled pipeline triggers using cron expressions. To trigger a workflow on a schedule, add the triggers key to the workflow and specify a schedule. Scheduled workflows use the cron syntax to represent Coordinated Universal Time (UTC).

### User Information

Retrieve information about the currently authenticated user and look up users by ID.

### OIDC Token Management

Manage custom claims for OpenID Connect tokens at the organization and project level. OIDC tokens enable CircleCI jobs to authenticate with cloud providers (AWS, GCP) without storing long-lived credentials.

### Policy Management

Manage organization-level policies and retrieve decision audit logs for policy enforcement.

### Webhook Management (API-based)

Create, list, update, and delete outbound webhooks for projects programmatically through the API, as an alternative to configuring them via the UI.

## Events

CircleCI supports **outbound webhooks** that push event notifications to external services via HTTP POST requests.

Setting up an outbound webhook on CircleCI enables your third party service to receive information (referred to as events) from CircleCI, as they happen.

Webhooks are configured at the project level and require a receiver URL and an optional secret token for signature verification. Each outgoing HTTP request to your service will contain a `circleci-signature` header. The signature uses HMAC-SHA256 for payload verification. There is a limit of 5 webhooks per project.

### Workflow Completed

A workflow in CircleCI is used to organize jobs. It defines the order in which the jobs will run and the dependencies between them. On CircleCI, a build is said to be complete when the workflow is complete. Thus, this event is triggered when all the jobs in a workflow have finished running according to the rules defined in the workflow. The payload includes workflow status (success, failed, canceled), timing, associated project, organization, pipeline, and VCS commit details.

### Job Completed

A job on CircleCI is a collection of steps. A step is a unit of work, for example, a Linux command that installs a set of dependencies. When all the steps in a job are completed, this event is triggered. The payload includes job status, timing, associated project, organization, workflow, and pipeline details. This fires for both successful and failed job completions.
