Now let me get the Make-specific OAuth details and the full list of API scopes:Now I have enough information to write the specification. Let me compile everything I've gathered.

# Slates Specification for Make

## Overview

Make (formerly Integromat) is a no-code automation platform that allows users to create workflows ("scenarios") by connecting various apps and services through a visual editor. Its API provides programmatic access to manage scenarios, connections, data stores, webhooks, organizations, teams, and custom apps.

## Authentication

Make supports two authentication methods:

### 1. API Token

The Make API requires authentication of the API requests with your API tokens or your OAuth 2.0 connection.

To authenticate your API request, send your API token in the following HTTP header parameter: `Authorization: Token 12345678-12ef-abcd-1234-1234567890ab`.

Generate and manage API tokens from your profile in the Make interface. If you have access to multiple Make zones, generate separate tokens for each of them.

To create a token: sign in to Make, click your avatar, go to Profile > API tab, click "Add token", assign a label and select the desired scopes.

After you create your authentication token and open the API tab in your profile again, you can no longer change the token or the scopes assigned to the token.

### 2. OAuth 2.0

Make's API uses OAuth 2.0 authorization protocol to enable secure third-party access. This standard security framework allows applications to interact with Make's resources while protecting sensitive credentials. To be able to start using OAuth 2.0, your app has to request a client on our side.

Before implementing OAuth 2.0, PKCE (Proof Key for Code Exchange) provides enhanced security for public clients (mandatory for SPAs and mobile apps). Make supports the Authorization Code flow with refresh tokens for confidential (server-side) clients.

Complete the OAuth client registration form with your application details, choose your required API scopes, and submit your registration request. Our team will review your request within 10 business days. Upon approval, you'll receive the necessary credentials.

### Base URL

The API base URL is zone-specific. The `{zone_url}/api/{version}` forms the base URL of the Make API. For example, the URL `https://eu1.make.com/api/v2` is a base URL for the Make API for organizations in the EU1 zone.

Available zones include: `eu1.make.com`, `eu2.make.com`, `us1.make.com`, `us2.make.com`, `eu1.make.celonis.com`, `us1.make.celonis.com`.

### Scopes

There are two types of scopes - read and write. Read scopes allow you to use the GET method with endpoints, usually to get a list of resources or a resource detail. No modification is allowed. Write scopes allow you to use the POST, PUT, PATCH, or DELETE methods with endpoints to create, modify, or remove resources.

Key scope categories include: `scenarios:read/write`, `connections:read/write`, `hooks:read/write`, `datastores:read/write`, `teams:read/write`, `users:read/write`, `sdk-apps:read/write`, and admin-level scopes. Some resources require more than one scope.

## Features

### Scenario Management

Create, list, update, delete, activate, deactivate, clone, and run automation scenarios. Retrieve scenario details, execution logs, and consumption/usage statistics. Manage scenario blueprints (the JSON definition of a scenario's module flow and configuration) including versioning and draft/live states. Organize scenarios into folders. Manage scenario-level custom properties and buildtime variables.

### Connection Management

Create new connections with data passed in the request body and receive all details of the created connection. List, update, rename, delete, and verify connections. Verify the connection status — this endpoint communicates with the API of the app that includes the given connection and verifies if credentials saved in Make are still valid. It returns confirmation if the connection is verified (true) or not (false).

### Data Stores and Data Structures

Data stores are used to store data from scenarios or for transferring data in between individual scenarios or scenario runs. Create, list, update, and delete data stores. Manage records within data stores (create, read, update, delete records). Define and manage data structures that describe the schema for data stores.

### Webhooks (Hooks)

Retrieve a collection of all hooks for a team. Returned hooks are sorted by name in ascending order. Create, update, and delete webhook endpoints. Two native Make hook types are `gateway-webhook` and `gateway-mailhook`. Manage incoming data and hook logs.

### Organizations and Teams

Manage organizations, including user roles within organizations, and child organizations (for MMS/multi-organization setups). Create, update, and delete teams. Manage team membership, roles, and team-level variables.

### Custom Apps (SDK Apps)

Create and manage custom app integrations built with the Make Apps SDK. Manage app modules, RPCs (remote procedure calls), functions, connections, and webhooks within custom apps. Handle app invitations, review requests, cloning, and uninstalling.

### Users and Notifications

Manage user profiles, organization invitations, team roles, and notification preferences. Retrieve and update notifications for users within teams.

### Analytics and Audit Logs

Retrieve organization-level analytics data. Access audit logs for organizations and teams to track changes and actions performed on the platform.

### AI Agents

Manage AI agents, their context configurations, and LLM provider settings.

### Keys and Devices

Manage encryption keys (e.g., AES, API Key Auth) used within scenarios. Manage devices for incoming and outgoing data flows.

### Incomplete Executions

Access and manage scenario executions that did not complete successfully, enabling retry or inspection of failed runs.

## Events

The Make API does not provide a native webhook or event subscription mechanism for listening to platform-level events (such as scenario status changes or execution completions) through the API itself.

Make does support **incoming webhooks** as triggers within scenarios — these allow external services to send data to Make to trigger scenario executions. However, this is a feature of the automation platform for building workflows, not an event subscription system for the Make API itself.

The provider does not support events for API consumers to subscribe to changes on the Make platform.
