Now let me fetch the full API documentation to get more details on endpoints and webhooks.Now I have enough information to write the specification.

# Slates Specification for Promptmate.io

## Overview

Promptmate.io is a platform for building AI-powered applications that combine multiple AI systems (ChatGPT, Mistral AI, Claude, Gemini, Stability AI, and others) into multi-step workflows. It supports bulk data processing via CSV uploads, external data integration (e.g., Google SERPs, website content, LinkedIn profiles), and offers ready-to-use templates for common tasks like content generation, SEO optimization, and prospecting.

## Authentication

Promptmate.io uses API key authentication. The API key must be passed as a header parameter named `x-api-key` in every request.

**Base URL:** `https://api.promptmate.io/v1/`

**Header format:**

```
x-api-key: YOUR_API_KEY
```

The API key can be obtained from your Promptmate.io account. You can verify your key works by calling the `GET /v1/userInfo` endpoint.

No OAuth or additional scopes are required. All access is governed by the single API key tied to your account and plan.

## Features

### App Management

Retrieve a list of your apps and get detailed information about a specific app, including its structure and required data fields. Each app has a unique ID, a name, estimated credit cost per row, required data fields, and response fields.

### App Job Execution

Create new jobs to run an app with specific configuration and input data. Each job accepts an array of data objects (rows) containing the required data fields for the app, plus optional extra fields that are returned in results. Jobs can be configured with:

- **Language and country** settings for localized processing.
- **Callback URL** for receiving results when the job completes.
- **Email suppression** option to disable finish notifications.

You can also poll for job status and retrieve results via the API.

### Templates

List available templates and use a specific template to create an app or workflow. Templates are pre-built AI workflows covering use cases like content generation, SEO snippets, product descriptions, and competitor analysis.

### App Results

Retrieve the last result rows of an app, useful for fetching example outputs or recent job results.

### Reference Data

List available languages and countries that can be used to configure app jobs for localized processing.

### Projects

List projects to organize and manage your apps within the platform.

### User Information

Retrieve account information for the authenticated user, useful for verifying credentials and checking account status.

## Events

Promptmate.io supports webhooks that can be registered via the API. Webhooks are user-based.

### Job Completion Events

`job` type webhooks trigger after a complete job has finished. The payload contains an array with all result data from the job. Useful for being notified when an entire batch of data has been processed.

### Row Completion Events

`row` type webhooks trigger after each individual row has finished processing. The payload contains an array with a single result entry. Useful for streaming results as they become available rather than waiting for the full job.

### Webhook Configuration Options

- **Restricted App IDs:** Webhooks can be restricted to specific apps. If no apps are defined, the webhook will be triggered for all apps.
- **Endpoint URL:** The URL that will be called when the webhook fires.
- **Webhook Reference:** A custom reference string for identifying the webhook.
