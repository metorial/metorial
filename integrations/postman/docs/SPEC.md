Now let me check if there's more detail on the Postman API's user/team management and secret scanner features:Now I have comprehensive information about the Postman API. Let me compile the specification.

# Slates Specification for Postman

## Overview

Postman is an API development platform for designing, building, testing, and monitoring APIs. It provides tools for managing API collections, environments, mock servers, monitors, API specifications, and team collaboration through workspaces. The Postman API allows programmatic access to manage these resources and integrate Postman into development toolchains.

## Authentication

Postman uses **API key authentication** for its API.

- The Postman API uses API keys for authentication.
- You must authenticate your requests to the Postman API by sending your API key in the `X-API-Key` header of every request you make.
- Your API key provides access to any Postman data you have permissions for.

**Generating an API key:**

API keys are generated from the Postman account settings page under the "API keys" section. Each key is tied to the user who created it and inherits that user's permissions.

**Collection access keys:**

With a collection access key you can securely grant other users read-only access to a single collection. You will generate a new collection access key every time you share a collection using the Postman API.

**Base URL:** `https://api.postman.com`

**Example request:**

```
GET https://api.postman.com/collections
X-API-Key: PMAK-your-api-key-here
```

**SCIM (Enterprise only):**

For enterprise teams, Postman also supports SCIM (System for Cross-domain Identity Management) for automated user provisioning via an identity provider. SCIM endpoints use the same API key authentication.

## Features

### Workspace Management

Manage Postman workspaces programmatically. Use the Workspaces APIs to manage your Postman workspaces. These endpoints enable you to create temporary workspaces to test, which you can then delete when you're finished. You can also save a backup of another workspace or specific resources (such as collections or APIs) using the Postman API.

### Collection Management

Use the Collections APIs to manage your Postman Collections and simplify collection-related workflows. You can add, delete, or update your collections, update an entire collection or a collection's requests, folders, and responses, transfer collection items between collections or folders, and manage your collection forks, pull requests, and published documentation.

- You can also import an OpenAPI definition to create a collection or transform an existing collection into an OpenAPI definition. This lets you automatically generate a collection from your source code or API definition so you can then automatically sync it with Postman. Any resources that depend on that collection, such as monitors or mock servers, will also see the updated requests and responses.

### Environments and Variables

The Environments API enables you to programmatically manage your Postman environments. You can use this API to manage your global variables, which scope your work to different environments (such as local development, testing, or production). You can also manage collection variables, which are available throughout a collection's requests.

### API Specifications (Spec Hub)

The Specs APIs enable you to manage your API specifications created in Postman's Spec Hub. You can programmatically create, update, or get the complete definition of an API specification, generate collections from specs or generate specs from an existing Postman Collection, synchronize your collections and specs, get details about API specifications in a workspace, and list all the collections generated from an API specification.

### Mock Servers

In addition to performing CRUD operations on your mock servers, you can use the Mocks API to set a mock server to public or private, list all calls received by a mock server, and manage mock server responses for 5XX errors.

### Monitors

The Monitors API enables you to programmatically run collections, depending on specific events on your CI/CD pipelines. You can also create and run a webhook, which is a special monitor that runs a collection.

- Runners API allows retrieving metrics for private API monitoring runners.

### Comments

The Comments endpoints enable you to manage comments on Postman APIs, collections, collection folders, requests, and responses. You can use comments to collaborate and discuss your work with your teammates in Postman.

### Version Control (Forks and Pull Requests)

Use the Forks endpoints to manage forks of Postman collections and environments. Forks are new instances of an element that you can change without making any changes to the parent element. You can find all forks for a specific collection or environment, get the current status of a forked collection's source, and programmatically create or merge forks and pull source changes.

The Pull Requests endpoints enable you to manage pull requests in Postman. Pull requests enable reviewers to look at your changes, leave comments on them, and decide whether to approve and merge them into the parent element.

### User and Team Management

- Retrieve information about the authenticated user, including current usage data.
- Get team members and manage user groups.
- Manage roles and permissions on workspaces and collections.
- SCIM provisioning for automated user onboarding/offboarding (Enterprise only).

### Private API Network (Plan-dependent)

The Private API Network API enables you to programmatically manage your Private API Network. Use these endpoints to automate the management of your team's internal documentation, integrate it with CI/CD, and ensure that the documentation is always up-to-date. This API also enables you to get all user requests to add elements to your Private API Network and approve or reject them.

### Tags (Plan-dependent)

Use the Tags APIs to manage your Postman tags programmatically. You can add or remove tags from Postman collections and workspaces. You can also retrieve all Postman elements matching a given tag.

### Secret Scanner (Enterprise)

Programmatically manage secrets detected by the Postman Secret Scanner. Search detected secrets, find their locations, update resolution statuses, and build automatic notification systems.

### API Security and Governance (Plan-dependent)

Run security checks on API definitions and track governance and security rule violations. Validate OpenAPI definitions against configured rules.

### Audit Logs (Enterprise)

Monitor and analyze team activity. Admins can review audit logs to see when users were added or removed, and which user performed specific actions.

### Billing

Retrieve information about your Postman billing account for compliance and integration with internal systems.

## Events

You can configure a custom webhook with Postman to send events such as monitor results or team and collection-specific activity feeds, or to back up your Postman Collections. These are outbound webhooks configured through Postman's integrations interface.

### Collection Backup

Postman periodically checks your collection for changes. If Postman identifies changes when it checks your collection, the changes automatically send to your custom webhook.

- Configure a target webhook URL to receive the collection data whenever changes are detected.
- Scoped to a specific collection within a workspace.

### Monitor Results

Whenever your monitor runs, the results are posted to your webhook.

- Select a specific monitor to watch.
- Select "Notify for all completed monitor runs" or "Notify for 3 failures and then first success."

### Team Activity Feed

The activity feed tracks changes made to your collections and within your team. You can send team activity to custom webhooks.

- Posts team-level activity events (e.g., collection changes, team membership changes) to a configured webhook URL.
