# Slates Specification for Apify

## Overview

Apify is a cloud platform for web scraping, browser automation, and data extraction. It provides a marketplace of pre-built automation tools called "Actors" that can be run, scheduled, and orchestrated via API, with built-in storage for results. The platform is commonly used to extract structured data from websites and feed it into downstream applications or AI pipelines.

## Authentication

Apify uses **API token** authentication. You can find your API token on the Integrations page in the Apify Console. Add the token to your request's `Authorization` header as `Bearer <token>` (e.g., `Authorization: Bearer xxxxxxx`).

Alternatively, the API token can be provided as a query parameter (e.g., `?token=your_token`), though this is less secure.

**Token types:**

- When working under an organization account, there are two types of API tokens: Personal API tokens (which have the same permissions as the user within the organization) and Organization API tokens (which have full permissions and are not tied to a specific member).

**Scoped tokens:**

- By default, tokens can access all data in your account. You can choose to limit the permissions of your token to make it "scoped," so it can only access explicitly allowed resources.
- Scoped tokens cannot create or modify Actors. Use an unscoped token for that purpose.
- Scoped tokens support both account-level permissions (apply to all resources) and resource-specific permissions (apply to individual resources like a specific dataset or Actor).

**Base URL:** `https://api.apify.com/v2`

## Features

### Actor Management

Create, update, delete, and list Actors (serverless automation programs). Apify is built around Actors—a packaging format for code that makes it easy to share, integrate, and build upon. You can browse and use pre-built Actors from the Apify Store or deploy your own custom Actors.

### Running Actors

Start Actor runs synchronously or asynchronously, providing custom input and configuring runtime options. You can set optional timeout (in seconds) and memory limit (in megabytes, must be a power of 2 with a minimum of 128). Synchronous runs wait up to 5 minutes for the Actor to finish and return results directly. Asynchronous runs return immediately with a run ID that can be polled for status and results.

### Actor Tasks

Tasks provide reusable run configurations for Actors. A task saves a specific Actor's input configuration so it can be run repeatedly with the same settings. Tasks can be run, scheduled, and monitored independently.

### Datasets

Datasets are structured storage optimized for tabular or list-type data, ideal for scraped items or processed results. Dataset storage enables you to sequentially save and retrieve data. A unique dataset is automatically created and assigned to each Actor run. Data can be exported in JSON, CSV, XML, Excel, RSS, and HTML formats. Datasets are append-only.

### Key-Value Stores

The key-value store is simple storage that can be used for storing any kind of data—JSON or HTML documents, zip files, images, or strings. The data are stored along with their MIME content type. Key-value stores are mutable and useful for storing Actor input/output, configuration, screenshots, and other files.

### Request Queues

Request queues enable you to enqueue and retrieve requests such as URLs with an HTTP method and other parameters. They prove essential not only in web crawling scenarios but also in any situation requiring the management of a large number of URLs. Supports both breadth-first and depth-first crawling strategies, deduplication, and incremental crawling across runs.

### Schedules

Schedules are used to automatically start your Actors at certain times. Each schedule can be associated with a number of Actors and Actor tasks. Schedules are configured using cron expressions. Each schedule can be associated with a maximum of 10 Actors and 10 Actor tasks. You can override Actor input when scheduling.

### Webhooks

Create and manage persistent webhooks that fire HTTP POST requests to a specified URL when certain events occur on Actors or tasks. Webhooks support customizable payload templates with dynamic variables. Ad-hoc (single-use) webhooks can also be attached when starting a specific Actor run.

### Actor Builds

Trigger and manage builds for your Actors. Builds compile Actor source code into runnable Docker images. You can specify build versions and tags.

### User and Account Information

Retrieve account details, usage statistics, and plan information for the authenticated user.

## Events

Apify supports webhooks that send HTTP POST requests to a specified URL when system events occur. Webhooks allow you to configure the Apify platform to perform an action when a certain system event occurs. Webhooks can be created persistently (tied to an Actor or task) or as ad-hoc webhooks for individual runs.

### Actor Run Events

Actor run events are triggered when an Actor run is created or transitions to a new state. You can define webhooks for all runs of an Actor on its detail page or for a specific Actor task on its detail page. In the latter case, the webhook is invoked only for runs started for that task.

Available events:

- `ACTOR.RUN.CREATED` - A new Actor run has been created.
- `ACTOR.RUN.SUCCEEDED` - An Actor run finished with status SUCCEEDED.
- `ACTOR.RUN.FAILED` - An Actor run finished with status FAILED.
- `ACTOR.RUN.ABORTED` - An Actor run finished with status ABORTED.
- `ACTOR.RUN.TIMED_OUT` - An Actor run finished with status TIMED-OUT.
- `ACTOR.RUN.RESURRECTED` - An Actor run has been resurrected.

Event payload includes the Actor ID, Actor task ID (if applicable), and Actor run ID.

### Actor Build Events

Actor build events are triggered when an Actor build is created or transitions into a new state.

Available events:

- `ACTOR.BUILD.CREATED` - A new Actor build has been created.
- `ACTOR.BUILD.SUCCEEDED` - An Actor build finished with the status SUCCEEDED.
- `ACTOR.BUILD.FAILED` - An Actor build finished with the status FAILED.
- `ACTOR.BUILD.ABORTED` - An Actor build finished with the status ABORTED.
- `ACTOR.BUILD.TIMED_OUT` - An Actor build finished with the status TIMED-OUT.

Event payload includes the Actor ID and Actor build ID.

### Webhook Configuration Options

- **Condition**: Scope the webhook to a specific Actor and/or Actor task by ID.
- **Payload template**: A JSON-like syntax that allows you to include variables enclosed in double curly braces `{{variable}}`. Available variables include `userId`, `createdAt`, `eventType`, `eventData`, and `resource` (the full run or build object).
- **Headers template**: Custom headers can be added to the webhook request, also supporting variable interpolation.
- **Ad-hoc webhooks**: An ad-hoc webhook is a single-use webhook created for a specific Actor run when starting the run using the Apify API. The webhook triggers once when the run transitions to the specified state.
