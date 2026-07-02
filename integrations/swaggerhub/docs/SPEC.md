Now I have enough information to write the specification.

# Slates Specification for Swaggerhub

## Overview

SwaggerHub is a collaborative platform by SmartBear for designing, managing, and documenting APIs using the OpenAPI and AsyncAPI specifications. It provides a centralized registry for API definitions and domains, with built-in versioning, code generation, mock servers, and integrations with source control and API gateways. It is available as both a SaaS offering and an on-premise installation.

## Authentication

SwaggerHub uses API key authentication. You can find your personal API key on the **API Keys** page in your SwaggerHub account settings (https://app.swaggerhub.com/settings/apiKey). Send this key in the `Authorization` header when making requests to the API.

**Header format:**

```
Authorization: YOUR_API_KEY
```

For the Portal API specifically, the key is sent as a Bearer token: `Authorization: Bearer {API_KEY}`.

The base URL for the SaaS Registry API is `https://api.swaggerhub.com`. On-premise customers need to point to their own instance URL, typically `http(s)://{swaggerhub-host}/v1`.

There are no OAuth flows or scopes. The API key is tied to a specific user account, and the permissions available depend on the user's role (Consumer, Designer, or Owner) within the organization.

## Features

### API Definition Management

Access, manage, and update APIs, domains, integrations, projects, and templates in SwaggerHub via the Registry API. You can create, retrieve, update, and delete API definitions (OpenAPI 2.0, OpenAPI 3.x, and AsyncAPI). Each API has an owner, a name, and one or more versions. APIs can be set as public or private, and versions can be published or unpublished, with a configurable default version.

### Domain Management

Domains are reusable components (models, parameters, responses) that can be shared across multiple API definitions. You can create, retrieve, update, and delete domains, similarly to APIs, with versioning and visibility controls.

### Search and Discovery

Search the public API catalog, as well as your organization's private APIs and domains. Search returns metadata including owner, name, description, summary, version, and specification type.

### Collaboration and Comments

Retrieve all comments and replies added by collaborators on specific API or domain versions. This enables team feedback and review workflows around API specifications.

### Integrations Management

Add and trigger API-level integrations programmatically. Integrations connect SwaggerHub to external tools such as source control systems (GitHub, GitLab, Bitbucket), API gateways (AWS API Gateway, Azure API Management, Apigee, Kong), and CI/CD tools. You can create, list, update, and delete integrations on specific API versions.

### Project Management

Organize APIs and domains into projects for better grouping and team-level access control. Projects can contain multiple APIs and domains and have their own member lists.

### Code Generation

SwaggerHub can auto-generate client SDKs and server stubs from your API specification in more than 30 programming languages and frameworks.

### User and Organization Management

A separate User Management API lets you get information about organizations and their members, and add or remove organization members and change their roles in bulk. Available roles are Consumer, Designer, and Owner. You can also manage team-level and resource-level access permissions.

### API Standardization and Governance

Run standardization scans against API definitions using configured rules and style guides. Validation results include severity level, rule name, and location for each error or warning, enabling compliance with organization standards before publishing.

## Events

SwaggerHub supports webhooks as an integration type that can be configured on individual API definitions.

### API Version Saved / Published

When an API version is saved or published, SwaggerHub sends a POST request to the specified webhook URL. The payload includes the API path, the action performed (e.g., `after_api_version_saved`), and the full API definition.

- **Configuration options:**
  - Webhook URL (must be publicly accessible)
  - Content type (`application/json` or `application/x-www-form-urlencoded`)
  - Additional custom authorization headers can be specified if the webhook URL requires specific authentication.
  - The integration can be temporarily disabled without deleting it.
