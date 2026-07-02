Now let me check the webhook details and Content Sync API:Now I have enough information to write the specification.

# Slates Specification for Agility CMS

## Overview

Agility CMS is a cloud-based headless content management system that provides APIs for managing and delivering structured content, pages, and media assets. It offers a set of APIs — Content Fetch, Content Management, and Content Sync, as well as GraphQL as an alternative way to access content. It is built on Microsoft Azure infrastructure and supports multi-locale content delivery.

## Authentication

Agility CMS uses two different authentication methods depending on the API being accessed:

### Content Fetch API & GraphQL — API Key Authentication

The API Key is a secret used for authentication that must be included in the header for each REST API request. To authenticate:

1. Obtain your **GUID** (instance ID) and **API Key** by navigating to Settings > API Keys in the Agility CMS dashboard.
2. There are two API key types: **fetch** (published content) and **preview** (returns unpublished content).
3. You can create as many API Keys as you see fit. API Keys may also have an optional expiry date.
4. Include the API key in the `APIKey` header of each request. Example:
   ```
   curl https://api.aglty.io/{guid}/preview/en-us/list/posts --header "APIKey: your-api-key"
   ```
5. The base API URL varies by hosting region (e.g., `api.aglty.io` for USA).

### Content Management API — OAuth 2.0

OAuth 2.0 authentication ensures secure access to your Agility CMS instances and content models. The flow is:

1. Redirect the user to `https://mgmt.aglty.io/oauth/authorize` with parameters: `response_type=code`, `redirect_uri`, `state`, and `scope` (e.g., `openid profile email offline_access`).
2. Exchange the authorization code for an access token by POSTing to `https://mgmt.aglty.io/oauth/token` with the `code` parameter.
3. The response includes `access_token`, `refresh_token`, and `expires_in`.
4. When the access token expires, refresh it by POSTing to `https://mgmt.aglty.io/oauth/refresh` with the `refresh_token`.
5. All Management API requests require the instance **GUID** and a **locale** code (e.g., `en-us`) in addition to the access token.

## Features

### Content Retrieval

The Content Fetch API is a REST API endpoint for all the Content and Pages in your Agility Instance. It allows fetching individual content items by ID, content lists by reference name (with sorting and filtering), page data, and sitemaps (flat or nested). A locale code is required for all content requests. Content can be retrieved in either published (live) or preview (staging) mode depending on the API key type used.

### GraphQL Content Access

Agility instances come with a GraphQL schema based on its defined content models. GraphQL provides flexible field selection, multiple queries in a single request, and filtering/sorting capabilities. GraphQL currently supports fetching content from the Content area; support for Pages, Page Templates, and Page Modules is under development.

### Content Management

The Content Management API allows programmatically managing content in Agility CMS, offering a robust toolkit for content imports, updates, and integrations. This includes:

- Creating, updating, deleting, publishing, and unpublishing content items and pages
- Workflow operations: approving, declining, requesting approval for content items
- Bulk content creation and batch workflow operations (publish, unpublish, approve, decline entire batches)
- Content history and comments retrieval

### Page Management

Pages can be created, updated, deleted, and organized in a tree structure. Operations include retrieving page trees, managing page templates, configuring content zones on pages, managing page security settings, and moving pages within the hierarchy.

### Media & Asset Management

Media management allows retrieving, uploading, and deleting media assets. Additional capabilities include managing galleries, creating/deleting/renaming folders, and moving files between locations.

### Content Models

Content models (schemas) can be retrieved, created, updated, and deleted. Both content modules and page modules can be managed, allowing programmatic configuration of the content structure.

### Content Sync

The Content Sync API minimizes REST API calls by enabling local caching of content for server-side rendered web apps and static site generators. It employs sync tokens to fetch only updated content, optimizing synchronization.

### URL Redirections

URL redirections can be managed programmatically through the Management API.

### User Management

Instance users can be listed, created/updated, and deleted through the Management API.

### Webhook Management

Webhooks can be created, listed, retrieved, updated, and deleted programmatically via the Management API. Each webhook can be configured for specific event types (publish, save, workflow events).

## Events

Webhooks allow external services to become aware of content changes that occur within your Agility CMS instance. Each time content changes in the CMS, Agility will notify each endpoint of the change and pass-on a message representing the exact change that occurred.

Webhooks are configured in Settings > Webhooks or via the Management API. Each webhook subscribes to a URL endpoint and one or more event types. Webhooks are not retried; all calls are fire and forget.

### Content Publish Events

Notifies subscribed endpoints when a Content Item or Page is published. The payload includes the state ("Published"), instance GUID, language code, content/page ID, version ID, and change date. For content items, the reference name is also included.

### Content Save Events

Notifies subscribed endpoints when a Content Item or Page is created or updated (saved). The payload includes the state ("Saved"), instance GUID, language code, content/page ID, version ID, and change date.

### Content Workflow Events

Notifies endpoints about Content or Page approval, decline, or approval requests. These events fire when workflow actions (request approval, approve, decline) are performed on content items or pages.
