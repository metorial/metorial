# Slates Specification for Hystruct

## Overview

Hystruct is an AI-powered web scraping platform that extracts structured data from websites based on user-defined schemas. Users create workflows with target URLs and data schemas, then run jobs to crawl and extract data into structured formats suitable for use cases like e-commerce listings, job postings, real estate, and financial data.

## Authentication

Hystruct uses API key authentication. All API requests must include the API key in the request header.

- **Method:** API Key
- **Header:** `x-api-key`
- **Base URL:** `https://api.hystruct.com`
- **Obtaining the key:** Log into the Hystruct dashboard, click on your profile picture (top right), navigate to Settings, then API Keys.
- **Limitation:** Only a single API key per account is supported.

Example header:

```
"headers": {
  "x-api-key": "YOUR-HYSTRUCT-API-KEY"
}
```

## Features

### Workflow Data Retrieval

Retrieve all extracted/scraped data for a specific workflow. Each workflow is associated with a target URL and a schema that defines what data to extract.

- Requires the `workflowId` to identify the workflow.
- Returns data shaped according to the schema defined for that workflow.

### Job Creation and Queuing

Programmatically trigger new scraping jobs for an existing workflow. A job initiates the crawling and data extraction process.

- Requires the `workflowId` to target the correct workflow.
- Jobs process asynchronously; crawling sub-pages may take up to 5 minutes depending on the site.

### Schemas

Schemas define the structure of data to extract from websites. They act as templates telling the AI extraction engine what information to look for.

- Supported field types: String, Number, Boolean, Date, and Array.
- Each field can have a name, description, type, and an example value.
- Providing example values helps the AI engine understand the intended format (e.g., `$10.00` for a price vs. a quantity).

### Loops (Multi-Page Scraping)

Loops allow scraping multiple pages that share the same structure, such as lists of products or blog posts.

- Enabled per workflow at creation time.
- Requires a URL pointing to a listing page; Hystruct follows links to individual items and scrapes each one.

### Webhook Management

List, create, and delete webhook subscriptions via the API.

- List all active webhook subscriptions.
- Subscribe to specific events for a given workflow.
- Unsubscribe by deleting a webhook subscription.

## Events

Hystruct supports webhooks for receiving real-time notifications about workflow events.

### Workflow Events

Notifications triggered when events occur within a workflow, such as job completion or data updates.

- **Configuration options:**
  - **Webhook URL:** The endpoint where event payloads will be sent via POST.
  - **Events:** Select which specific events to subscribe to (e.g., job completed, data updated).
  - **Workflow ID** (optional): Scope the subscription to a specific workflow. If omitted, events for all workflows may be received.
- The payload includes the `workflowId` and relevant event data.
