Now let me check for webhook/event support and the transformations feature:# Slates Specification for Vectorshift

## Overview

VectorShift is an AI automations platform for building, deploying, and managing AI workflows, knowledge bases, chatbots, and assistants. Teams leverage AI through VectorShift's no-code or SDK interfaces to search through knowledge bases, generate documents, and deploy chatbots and assistants. The platform provides a REST API at `https://api.vectorshift.ai/v1` that allows programmatic access to its core resources: pipelines, knowledge bases, chatbots, and transformations.

## Authentication

VectorShift uses API keys for authentication. API keys are passed as Bearer tokens in the `Authorization` header of each request.

**How to obtain an API key:**

1. Log in to the VectorShift platform at `https://app.vectorshift.ai`.
2. Click your profile on the top-left corner of the page, then click "Profile".
3. Navigate to the "API Keys" tab on the left sidebar.
4. Generate a new API key by clicking the "+" button.

**Usage:**

Include the API key in the `Authorization` header as a Bearer token:

```
Authorization: Bearer <your_api_key>
```

Example:

```
curl --request GET \
  --url https://api.vectorshift.ai/v1/pipelines \
  --header 'Authorization: Bearer <your_api_key>'
```

There are no OAuth flows, scopes, or additional credentials required. A single API key grants access to all API endpoints associated with the user's account.

## Features

### Pipeline Management

Pipelines are the heart of VectorShift. A pipeline is a visual workflow where you connect modular components (nodes) to process data and execute tasks. Through the API, you can:

- **Run pipelines** individually or in bulk by providing input data as key-value pairs.
- **Create, fetch, list, and delete** pipelines programmatically.
- **Control execution** by terminating, pausing, or resuming active pipeline runs.

### Knowledge Base Management

Knowledge bases allow AI workflows to leverage your data (e.g., files, documents, websites). Through the API, you can:

- **Create knowledge bases** with configurable document processing options including chunk size, chunk overlap, and processing implementation (Default, Textract, Unstructured, LlamaParse, or Other).
- **Add data** to existing knowledge bases (files, URLs, text).
- **Query knowledge bases** using semantic search.
- **Find and manage documents** within a knowledge base, including listing and deleting documents.
- **Fetch, list, and delete** knowledge bases.

### Chatbot Management

You can prototype, customize, and deploy a customer-facing chatbot in minutes. Use cases include customer support, onboarding flows, lead collection, and advisory. Through the API, you can:

- **Run chatbot conversations** programmatically without a UI.
- **Upload files** to a chatbot session for context.
- **Terminate** active chatbot sessions.
- **Create, fetch, list, and delete** chatbots.

### Transformations

Transformations allow you to run arbitrary code in VectorShift's isolated execution environment. Through the API, you can:

- **Run transformations** with specified inputs and receive computed results.
- **Create, fetch, list, and delete** transformations.

## Events

The VectorShift API does not natively support webhooks or event subscription mechanisms. The platform's trigger and automation system (e.g., email triggers, Slack message triggers, scheduled runs) is configured through the no-code platform UI or SDK, but is not exposed as a webhook/event subscription API for external consumers to register callbacks against.
