# Slates Specification for Contentful

## Overview

Contentful is a headless content management system (CMS) that provides structured content via APIs. It comprises REST and GraphQL APIs for managing and delivering content — the Content Delivery API for retrieving published content, the Content Management API for programmatically creating or updating content, and the Content Preview API for retrieving unpublished content. It also offers an Images API for retrieving and applying transformations to images.

## Authentication

Contentful uses different authentication methods depending on the API being accessed:

### API Keys (Content Delivery API & Content Preview API)

To request data from the Content Delivery API or Content Preview API, you can create API keys in the Contentful web app. A token provides read-only access to a single space. Each API key provides both a Delivery API token and a Preview API token. A **Space ID** is also required for all API requests.

- **CDA base URL**: `cdn.contentful.com` (or `cdn.eu.contentful.com` for EU data residency)
- **CPA base URL**: `preview.contentful.com`

### Personal Access Tokens (Content Management API)

Personal Access Tokens (PATs) offer a simpler alternative to OAuth tokens for accessing the Content Management API (CMA). Like OAuth tokens, PATs are tied to the user who requests them and carry the same permissions, including access to organizations, spaces, and content. PATs are user-managed and tied to a single account, making them suitable for development and automation tasks that require access from a single Contentful account.

- Created in the Contentful web app under **Settings > CMA tokens**
- **CMA base URL**: `api.contentful.com` (or `api.eu.contentful.com` for EU data residency)

### OAuth 2.0 (Content Management API)

OAuth token is a type of content management token which can be used in case of building a public integration that requests access to other Contentful user's data.

- **Authorization endpoint**: `https://be.contentful.com/oauth/authorize`
- **Token endpoint**: `https://be.contentful.com/oauth/token`
- **Scopes**: `content_management_read` or `content_management_manage`
- You can specify whether your client is confidential or public.
- OAuth apps are created at: `https://app.contentful.com/account/profile/developers/applications/new`

### Token Transmission

You can include the token as a query parameter `access_token=$token`, or as an HTTP header `Authorization: Bearer $token`. The header method is recommended.

## Features

### Content Modeling

Define the structure of your content using content types. A content type consists of a set of fields and other information. Content types support field validations, and each content type has an associated editor interface that controls its appearance in the web app. Content types must be activated (published) before entries can be created from them.

### Entry Management

Entries represent anything defined as a content type in a space. Entries can have link fields that point to other entries or assets. Entries follow a lifecycle of draft → published, and can be archived. Actions include create, update, publish, unpublish, archive, unarchive, and delete.

### Asset Management

Assets represent files (images, documents, videos, etc.) uploaded to Contentful. Assets follow the same lifecycle as entries (draft, published, archived). After publishing, assets are available via the Content Delivery API and the CDN.

### Spaces and Environments

All content and assets belong to a space. You will generally have at least one space for a project, but use separate spaces for testing or staging. Each space has a name, a set of locales, and metadata. Environments allow branching of content and content models within a space. An environment alias allows you to access and modify the data of an environment through a different static identifier.

### Localization

Locales allow you to define translatable content for assets and entries. Each locale has a name, code (e.g., `en-GB`), and an optional fallback locale. One locale is designated as the default.

### Content Tagging

Tags help you easily search for specific content in your environment. Tags are environment-scoped, meaning they exist within and are unique to an environment.

### Content Search and Querying

The Content Delivery API and Content Preview API provide rich querying capabilities for filtering, searching, and sorting entries and assets by fields, content types, tags, and more. Content can also be queried via the GraphQL Content API.

### Image Transformations

The Images API allows you to retrieve and apply transformations to images stored in Contentful. Transformations include resizing, cropping, format conversion, and quality adjustments via URL query parameters.

### Content Sync

The Content Delivery API provides a sync mechanism that allows you to perform an initial sync of all content and then retrieve only incremental changes (deltas) on subsequent requests using a sync token.

### Releases

A release is a way to group multiple pieces of content together in Contentful, so they can be managed together. Release actions allow publishing or unpublishing all items in a release at once.

### User and Organization Management

The User Management API helps organizations programmatically manage their organizations, organization memberships, teams, space memberships and more. The User Management API is available for Premium/Enterprise customers on current pricing plans.

### Scheduled Actions

Content can be scheduled for future publishing or unpublishing via scheduled actions through the Content Management API.

### Cross-Space References

Resource Links allow you to link content across multiple spaces. This enables content reuse across different projects.

## Events

Webhooks are HTTP callbacks which can be used to send notifications when data in Contentful is changed. Webhooks are configured per space and can be filtered by environment, entity ID, and content type.

### Content Events

Contentful provides a framework for creating webhooks based on five different types of content events: ContentType, Entry, Asset, Task, and Release.

- **Entry events**: Supports actions: create, save, auto_save, archive, unarchive, publish, unpublish, and delete.
- **Asset events**: Supports actions: create, save, auto_save, archive, unarchive, publish, unpublish, and delete.
- **Content Type events**: Supports actions: create, save, publish, unpublish, and delete.
- **Task events**: Supports create and save actions.

Webhook topics are specified as `[Type].[Action]` pairs (e.g., `Entry.publish`, `Asset.delete`), and wildcards are supported (e.g., `Entry.*` or `*.publish`).

### Action Events

Scheduled action webhooks can be used for keeping external systems apprised of changes to upcoming events or for emitting notifications in the case of a failed scheduled action execution.

- **Release events**: Called when the release entity itself is changed or deleted (create, save, delete).
- **Release Action events**: Emitted after a release action has been created or executed, regardless of outcome.
- **Bulk Action events**: Triggered when bulk operations are created or executed.
- **Scheduled Action events**: Triggered when scheduled actions are created or executed.

### Webhook Configuration Options

- The webhook definition holds a filters property. Filtering is a second step after defining the topics. Typical use cases for filtering are enabling a webhook only for a specific environment ID or entry ID.
- Custom headers and HTTP basic authentication can be configured on webhook endpoints.
- Webhook payload transformations allow customizing the body sent to the endpoint.
- Signing secrets can be configured for request verification.
