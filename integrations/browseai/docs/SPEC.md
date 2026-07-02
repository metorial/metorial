Let me get the actual API documentation.# Slates Specification for Browseai

## Overview

Browse AI is a no-code web scraping and monitoring platform that allows users to extract data from websites using configurable "robots." It provides a REST API to programmatically run extraction tasks, retrieve scraped data, set up monitoring schedules, perform bulk operations, and manage webhooks.

## Authentication

Browse AI uses API keys for authentication.

To authenticate, include the API key as a Bearer token in the `Authorization` header of each request:

```
Authorization: Bearer YOUR_SECRET_API_KEY
```

To create an API key:

1. Log in to the Browse AI dashboard.
2. Navigate to the **API** tab in the main navigation.
3. Click **Create API key** and give it a descriptive name.
4. Copy and securely store the key.

The API is available on all Browse AI plans at no additional cost. Multiple API keys can be created per account. The base URL for all API requests is `https://api.browse.ai/v2`.

## Features

### Robot Management

Allows listing and retrieving details of configured web scraping robots. Each robot has a unique ID, name, and a set of input parameters (e.g., `originUrl`) that define what data it extracts. Robots expose their input parameters including name, type, and whether they are required.

### Task Execution

Runs a robot on-demand with custom input parameters. A task is created by providing the robot ID and the required input parameters (typically a URL to scrape). Tasks run asynchronously; you submit a task and then retrieve results once complete. Results include extracted text fields (`capturedTexts`) and optionally captured screenshots.

### Data Retrieval

Allows retrieving the results of individual tasks or listing all tasks for a given robot. Extracted data is returned as structured key-value pairs based on the fields configured when the robot was created.

### Automated Monitoring

Robots can be configured to run on a schedule to automatically monitor web pages for changes. When monitoring detects that captured data has changed, it can trigger notifications via webhooks.

### Bulk Operations

Supports large-scale data extraction by submitting bulk runs that can process many pages in a single command. Table exports can be generated when bulk operations complete.

### Cookie Management

Robot cookies can be updated via the API, which is useful for maintaining authenticated sessions on target websites that require login.

### Webhook Management

Webhooks can be created, configured, and managed programmatically per robot. Each webhook is associated with a specific event type and a destination URL.

## Events

Browse AI supports webhooks that send HTTP POST callbacks to a specified URL when events occur. Webhooks are configured per robot and per event type.

### Task Completion

- **`taskFinished`** — Fires when any task completes, regardless of success or failure. The payload includes task ID, status, captured data, screenshots, and metadata.
- **`taskFinishedSuccessfully`** — Fires only when a task completes successfully. Useful for data processing pipelines that only need successful results.
- **`taskFinishedWithError`** — Fires only when a task fails. Useful for error alerting and monitoring.

### Data Change Detection

- **`taskCapturedDataChanged`** — Fires when a monitoring run detects that previously captured data has changed. The payload includes the updated fields and a `changedFields` array indicating which specific fields changed.

### Export Completion

- **`tableExportFinishedSuccessfully`** — Fires when a table export finishes (currently in Beta). The payload includes the export format, download URL, and record count.
