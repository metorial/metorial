Now let me get the specific OAuth scopes and the full list of webhook events:Now let me get the full scopes list:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Webflow

## Overview

Webflow is a visual website builder and CMS platform that allows designing, building, and launching websites without writing code. Its API provides programmatic access to manage sites, CMS content, ecommerce operations, user accounts, forms, assets, pages, and custom code. Webflow also offers a Designer API for interacting with the visual canvas and components.

## Authentication

Webflow supports two authentication methods, both using bearer tokens in the `Authorization` header.

### 1. Site Tokens (API Keys)

Site Tokens provide a simple way to authenticate API requests for a specific Webflow site. Best suited for internal tools and single-site integrations where you control the environment.

- Generated in the Webflow dashboard under **Site Settings > Apps & Integrations > API Access**.
- Only site administrators are authorized to create a site token.
- When generating, enter a name for your token and choose the scopes needed for your use case.
- API tokens expire after 365 consecutive days of inactivity. Any API call made with the token before expiry will reset the inactivity period.
- Site tokens are created per site. If you're looking to build an integration that works across multiple sites, consider creating a Webflow App.
- Each site can have up to 5 tokens.

Usage: Include the token as a bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_SITE_TOKEN
```

### 2. OAuth 2.0 (Authorization Code Grant)

OAuth Tokens are used for complex integrations that span multiple sites or require user-specific access. Ideal for public integrations, Apps in the Webflow Marketplace, or any scenario requiring secure, user-specific access.

- Webflow uses the Authorization Code Grant flow to provide access tokens to Apps.
- Requires creating a Webflow App (Data Client) in the workspace dashboard to obtain a `client_id` and `client_secret`.
- **Authorization URL:** `https://webflow.com/oauth/authorize`
- **Token URL:** `https://api.webflow.com/oauth/access_token`
- **Revoke URL:** `https://api.webflow.com/oauth/revoke`
- Parameters for the authorization link: `client_id`, `response_type` (always `"code"`), `redirect_uri`, and optionally `state` for CSRF protection.
- Scopes are written in the format `scope:action`. For example: `sites:read sites:write pages:read`.
- The scopes requested in the OAuth URL must be equal to or a subset of the scopes configured for your app in the app settings. If there's a mismatch, users won't be able to install your app.

### Available Scopes

Scopes come in `:read` and `:write` pairs for each resource:

| Resource           | Scopes                                  |
| ------------------ | --------------------------------------- |
| Sites              | `sites:read`, `sites:write`             |
| Pages              | `pages:read`, `pages:write`             |
| CMS                | `cms:read`, `cms:write`                 |
| Assets             | `assets:read`, `assets:write`           |
| Forms              | `forms:read`, `forms:write`             |
| Ecommerce          | `ecommerce:read`, `ecommerce:write`     |
| Users              | `users:read`, `users:write`             |
| Custom Code        | `custom_code:read`, `custom_code:write` |
| Comments           | `comments:read`, `comments:write`       |
| Components         | `components:read`, `components:write`   |
| Authorized User    | `authorized_user:read`                  |
| Site Activity      | `site_activity:read`                    |
| Site Configuration | `site_config:read`, `site_config:write` |
| Workspace          | `workspace:read`, `workspace:write`     |

## Features

### Site Management

Retrieve information about Webflow sites in a workspace, including site metadata and custom domains. Trigger site publishes programmatically to push changes live.

### CMS (Content Management)

Webflow's CMS API lets you programmatically create, manage, and publish content. Use it to build custom workflows, integrate with external systems, and automate content management. Manage collections (schemas), collection fields, and collection items (content entries). Supports both staged (draft) and live (published) items. Localized content is supported for multi-locale sites.

### Pages and Components

Manage pages on a Webflow site, including retrieving page metadata and content. Access and manage reusable components within a site.

### Forms

Retrieve forms structure (i.e., form fields) and submissions, connect Webflow forms to external data sources.

### Ecommerce

Perform CRUD operations on Ecommerce products and orders. Manage product inventory levels and retrieve/update ecommerce settings.

### User Accounts

Perform CRUD operations on User Accounts. Manage user memberships, invite users, and control access groups for gated content.

### Assets

Add assets to Webflow's Assets panel, create and assign assets to folders in the Assets panel, or retrieve a list of all existing assets by ID or site.

### Custom Code

Add and maintain custom JavaScript scripts on sites and pages. Register and manage custom code blocks at the site or page level.

### Comments

Surface Webflow comment activity with other collaboration and project management tools. List comment threads and replies on a site.

### Enterprise Features

For enterprise workspaces: access workspace audit logs, site activity logs, site configuration (including URL redirects), and workspace management capabilities.

## Events

Webhooks are a powerful way to integrate your applications and services with Webflow, allowing you to receive real-time updates whenever specific events occur on your site. By setting up webhooks, you can automate workflows, trigger external processes, and synchronize data across different platforms.

Webhooks are created per site and require a destination URL, a trigger type, and a site ID. Webflow provides methods to verify that requests are genuinely coming from the Webflow API by using signatures included in the request headers. These signatures vary based on the creation method of the webhook.

### Form Submissions

Fires when a form is submitted on the site. Includes form name, submitted data, and form ID.

- Supports a `filter` parameter to limit notifications to a specific form by name.
- Required scope: `forms:read`

### Site Publish

Fires when the site is published. Includes the domains published to and the user who published.

- Required scope: `sites:read`

### Page Events

Fires when pages are created, have their metadata updated, or are deleted.

- Events: `page_created`, `page_metadata_updated`, `page_deleted`
- Required scope: `pages:read`

### Ecommerce Events

Fires on ecommerce activity: new orders, order status changes, and inventory changes.

- Events: `ecomm_new_order`, `ecomm_order_changed`, `ecomm_inventory_changed`
- Required scope: `ecommerce:read`

### User Account Events

Fires when user accounts are added, updated, or deleted on membership-enabled sites.

- Events: `user_account_added`, `user_account_updated`, `user_account_deleted`
- Required scope: `users:read`

### Collection Item Events

Fires on CMS collection item changes: item created, changed, deleted, or unpublished.

- Events: `collection_item_created`, `collection_item_changed`, `collection_item_deleted`, `collection_item_unpublished`
- For localized items, deletion triggers a webhook for each locale.
- Required scope: `cms:read`
