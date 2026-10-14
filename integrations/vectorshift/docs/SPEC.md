# VectorShift API Integration

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

There are no OAuth flows, scopes, or additional credentials required. The API key is used for resources available to its owner.

## Features

### Pipeline Management

Pipelines are the heart of VectorShift. A pipeline is a visual workflow where you connect modular components (nodes) to process data and execute tasks. Through the API, you can:

- **Run pipelines** individually or in bulk by providing input data as key-value pairs.
- **Create, fetch, list, and delete** pipelines programmatically. Pipeline creation accepts a name and optional description and returns a pipeline ID.
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
- **Upload files** to a chatbot session for context using base64-encoded bytes. The result includes the conversation ID, knowledge base ID, uploaded file identifiers, and any per-file errors.
- **Terminate** active chatbot sessions.
- **Create, fetch, list, and delete** chatbots. The REST reference marks input and output specifications as required; provide them when creating a chatbot. The existing tool fields remain optional for compatibility. Deployment, access, Twilio, and Slack configuration objects can be provided as optional tool fields.

### Transformations

Transformations allow you to run arbitrary code in VectorShift's isolated execution environment. Through the API, you can:

- **Run transformations** with specified inputs and receive computed results.
- **Create, fetch, list, and delete** transformations.

## REST API Reference

- [API overview and API keys](https://docs.vectorshift.ai/api-reference/overview)
- [Create a pipeline](https://docs.vectorshift.ai/api-reference/pipelines/create)
- [Index knowledge-base data](https://docs.vectorshift.ai/api-reference/knowledge-bases)
- [Create a chatbot](https://docs.vectorshift.ai/api-reference/chatbots/create)
- [Upload chatbot files](https://docs.vectorshift.ai/api-reference/chatbots/upload)

The official REST documentation labels the API as beta. Error responses and endpoint behavior may change. HTTP failures and provider responses with `status: failed` are reported as failures.
