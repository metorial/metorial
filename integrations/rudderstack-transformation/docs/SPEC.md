Now let me fetch the full API documentation page for more details on the specific API operations:# Slates Specification for RudderStack Transformation

## Overview

RudderStack Transformation is a feature within RudderStack's customer data platform that allows users to write custom JavaScript or Python functions to transform event data in real-time before it reaches destinations. The Transformations API provides programmatic CRUD operations for managing these transformation functions and reusable code libraries via HTTP calls.

## Authentication

The Transformations API is authenticated via HTTP Basic Authentication.

To authenticate:

1. Generate a workspace-level Service Access Token with the required permissions (Create & Delete, Connect, and Edit for Transformations; Edit for Transformation Libraries; Connect for Destinations).
2. Use HTTP Basic Authentication with an empty string (`""`) as the username and your workspace-level Service Access Token as the password.

Alternatively, pass the token directly in the authorization header as:

```
Authorization: Basic {Base64Encoded(:<SERVICE_ACCESS_TOKEN>)}
```

The base URL depends on your region:

- **US**: `https://api.rudderstack.com`
- **EU**: `https://api.eu.rudderstack.com`

RudderStack recommends Service Access Tokens (SATs) for production use cases and Personal Access Tokens (PATs) for testing or personal use.

## Features

### Transformation Management

Allows you to create, read, update, and delete transformations programmatically via HTTP calls. Transformations are custom functions that convert event data into destination-specific formats.

- Transformations can be written in JavaScript or Python 3.11.
- Python transformations are available only in the RudderStack Cloud Growth and Enterprise plans.
- Transformations can be created in an unpublished (draft) state and published later when ready for live traffic.
- A transformation is always connected to a destination, and only one transformation can be connected per destination.
- Transformations can be used across Event Streams and Reverse ETL pipelines in both cloud mode and device mode.

### Transformation Publishing

Transformations support a publish workflow that separates drafts from live code. When unpublished, RudderStack only creates revisions for the transformation, meaning that you cannot connect destinations to the transformation and it cannot be used for incoming event traffic.

- Multiple transformations and libraries can be published in a single operation via the Publish API.
- A specific version of a transformation can be selected for publishing, enabling rollbacks.

### Version Control

Any update or change to a transformation causes RudderStack to save the older version as a revision. Multiple revisions are recorded, and the API allows you to roll back and publish any specific version.

- Versions can be listed and retrieved individually by transformation or library ID.
- Revisions are never deleted, even when the transformation itself is deleted.

### Reusable Libraries

The API exposes libraries for a better development workflow. They give you the flexibility to reuse and maintain different versions of your transformation code. Libraries are JavaScript or Python functions that you can write, export, and reuse.

- Libraries are imported into transformations by their auto-generated `importName` (camelCase of the library name).
- Libraries have their own independent CRUD operations and version history.
- If you update a library referenced in a transformation, RudderStack tests the new library code along with the transformation code against the default event payload to ensure the transformation does not break.

### Transformation Templates

RudderStack provides prebuilt JavaScript transformation templates for common use cases including data cleaning and enrichment, event filtering and sampling, and PII management.

- Templates are currently only available for JavaScript.
- Templates cover use cases like IP anonymization, Clearbit enrichment, URL parameter extraction, and bot filtering.

### Credential Store

The credential store is a central repository for securely storing and managing configuration data. By storing secrets and variables in the credential store, you can avoid hardcoding sensitive information in your transformations.

- Two types of credentials are supported: Secrets and Variables.
- Credentials are accessed within transformation code using the `getCredential()` function.
- Available only in the RudderStack Starter, Growth, and Enterprise plans.

### CI/CD via GitHub Actions

You can create, test, and publish transformations and libraries directly from your development repository, automating transformation testing and deployment with GitHub Actions.

- Supports test input files and expected output validation.
- Uses a meta file to define which transformations and libraries to test and publish.

### Testing and Debugging

RudderStack lets you test transformations to identify and prevent errors, allowing you to test various scenarios and edge cases on event payloads.

- Four sample payload types are provided for testing: identify, track, page, and screen.
- Live events from connected sources can be imported for testing.
- A `log` function is available to capture event-related information during testing.

## Events

The provider does not support events. The Transformations API is a management API for CRUD operations on transformation and library objects; it does not provide webhooks or event subscription mechanisms.
