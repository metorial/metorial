Now let me get the specific webhook event types:Now I have enough information. Let me compile the specification.

# Slates Specification for Productboard

## Overview

Productboard is a product management platform that helps teams collect and organize user feedback, prioritize features, and plan product roadmaps. It provides a REST API (v1, with v2 in beta) for managing product hierarchy, notes/feedback, releases, objectives, initiatives, custom fields, and integrations programmatically.

## Authentication

Productboard supports two authentication methods:

### 1. API Token (Bearer Token)

Accessing the Productboard API requires authentication, which can be done through a Public API Access token. For simpler, one-off integrations or initial experimentation, the API token is recommended.

- Workspace admins can generate a developer token from the Integrations page in workspace settings.
- The token is passed as a Bearer token in the `Authorization` header along with an `X-Version: 1` header.

Example:

```
Authorization: Bearer <your-api-token>
X-Version: 1
```

Base URL: `https://api.productboard.com`

### 2. OAuth 2.0 (Authorization Code Grant)

Productboard provides the ability to allow users to grant access to their workspaces to an external application in a safe, transparent, and restricted manner using OAuth2, an industry-standard protocol for authorization.

- **Application Registration**: Register your OAuth2 application at `https://app.productboard.com/oauth2/applications`. Requires an active Productboard account.
- **Authorization Endpoint**: `https://app.productboard.com/oauth2/authorize`
  - Required parameters: `client_id`, `response_type=code`, `redirect_uri`
  - Optional parameters: `state`, `code_challenge`, `code_challenge_method` (for PKCE)
- **Token Endpoint**: `https://app.productboard.com/oauth2/token`
  - Required parameters: `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri`, `code`
- **Token Refresh**: Same endpoint with `grant_type=refresh_token`
- **Token Info**: `GET https://app.productboard.com/oauth2/token/info?access_token=<TOKEN>`
- **Token Revocation**: `POST https://app.productboard.com/oauth2/revoke`

**Token Lifetimes:**

- Access token expires after 24 hours
- Refresh token expires after 180 days (or 60 minutes after being used once)
- Authorization code expires after 10 minutes

Only Makers with admin access are able to authorize OAuth2 applications to access their workspaces.

**Scopes** (organized in read/create/manage categories):

| Scope                                                            | Description                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| `product_hierarchy_data:read`                                    | Read products, components, features, and their attributes |
| `product_hierarchy_data:create`                                  | Create features, releases, roadmaps                       |
| `product_hierarchy_data:manage`                                  | Edit and delete features and attributes                   |
| `custom_fields:read`                                             | Read custom field definitions                             |
| `releases:read`                                                  | Read releases and release groups                          |
| `releases:create`                                                | Create releases and release groups                        |
| `releases:manage`                                                | Edit and delete releases and release groups               |
| `notes:create`                                                   | Create notes                                              |
| `users:read`                                                     | List users                                                |
| `users:manage`                                                   | Edit users                                                |
| `users_pii:read`                                                 | Read PII from note-creating users                         |
| `members_pii:read`                                               | Read PII from Productboard workspace members              |
| `plugin_integrations:manage`                                     | Manage UI plugins                                         |
| `objectives:read` / `objectives:create` / `objectives:manage`    | Read, create, edit/delete objectives                      |
| `key_results:read` / `key_results:create` / `key_results:manage` | Read, create, edit/delete key results                     |
| `initiatives:read` / `initiatives:create` / `initiatives:manage` | Read, create, edit/delete initiatives                     |
| `feedback_form_configurations:read`                              | Read feedback form configurations                         |
| `feedback_forms:create`                                          | Submit notes via feedback forms                           |

Not all roles can authorize all scopes. Makers can only authorize a subset; Contributors are limited to `notes:create`, `users:read`, `users_pii:read`, `members_pii:read`, and `feedback_forms:create`.

## Features

### Notes & Feedback Management

Create, list, retrieve, update, and delete notes (feedback items) on the Insights board. The Notes API allows you to capture product ideas, requests, and feedback from any source and import them as notes on your Insights board. Notes support tags, links, followers, and user attribution. Feedback forms can also be configured and submitted via API.

### Product Hierarchy Management

Manage the full product hierarchy including products, components, and features. Features can be created, listed, retrieved, updated, and deleted. Features support statuses, descriptions, owners, and parent-child relationships (features and subfeatures). You can also list available feature statuses.

### Companies & Users

Create and manage companies and users that provide feedback. Companies support custom fields with configurable values. Users can be created, updated, and deleted, and associated with feedback.

### Custom Fields

Read custom field definitions and their values for hierarchy entities (products, components, features). Set or delete custom field values on specific entities.

### Releases & Release Groups

Create, manage, and organize releases and release groups for planning delivery timelines. Assign features to releases and manage those assignments.

### Objectives & Key Results

Create, read, update, and delete objectives and key results. Link objectives to features and initiatives to align product work with strategic goals.

### Initiatives

Create, read, update, and delete initiatives. Link initiatives to objectives and features to organize larger product efforts that span multiple features.

### Plugin Integrations

Display a column in Productboard UI allowing users to push features to third-party systems, create tickets in external systems based on feature data, and propagate changes between Productboard and connected tools. Plugin integrations support connection management between features and external entities.

### Jira Integration Management

Retrieve information about existing Jira integrations and their connections (read-only via API). The native Jira integration supports two-way field synchronization and automatic issue import.

## Events

Productboard's API offers webhook functionality, allowing you to subscribe to various events and receive notifications when changes occur in your Productboard workspace.

Webhooks are registered via the API by creating a subscription with a notification URL and an event type. When creating a webhook subscription, Productboard sends a probe request to verify that the specified endpoint intends to receive webhook notifications and that the requests can reach the destination.

### Feature Events

Receive notifications when features are created, updated, or deleted in the workspace. This includes changes to feature attributes such as status, name, description, timeframes, and custom field values.

### Note Events

Receive notifications when notes (feedback/insights) are created in the workspace.

### Component Events

Receive notifications when components in the product hierarchy change.

### Product Events

Receive notifications when products are modified.

### Plugin Integration Callbacks

When using plugin integrations, receive callback notifications when users click push/unlink buttons in the Productboard UI, enabling two-way sync workflows with external tools.
