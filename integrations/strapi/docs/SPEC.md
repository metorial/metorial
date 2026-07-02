Now I have enough information. Let me compile the specification.

# Slates Specification for Strapi

## Overview

Strapi is an open-source headless CMS that enables users to define custom content types and expose them via auto-generated REST and GraphQL APIs. It is a customizable Content Management System where you can easily build custom APIs in REST or GraphQL that can be consumed by any client or front-end framework. It provides content management, user management, role-based access control, internationalization, media management, and draft/publish workflows.

## Authentication

Strapi supports two primary authentication mechanisms for API access:

### 1. API Tokens (Recommended for integrations)

API tokens allow users to authenticate REST and GraphQL API queries. Using API tokens allows executing a request on REST API or GraphQL API endpoints as an authenticated user. API tokens can be helpful to give access to people or applications without managing a user account or changing anything in the Users & Permissions plugin.

- Tokens are created in the Strapi admin panel under **Settings → Global Settings → API Tokens**.
- The Token Type defines the access type to the resources/collections in Strapi. They include "Full access", "Custom", and "Read-only". The token duration is required and set to 7 days, 30 days, 90 days or unlimited.
- For the Custom token type, define specific permissions for your API endpoints by clicking on the content-type name and using checkboxes to enable or disable permissions.
- When performing a request to Strapi's REST API, the API token should be added to the request's Authorization header with the following syntax: `Bearer your-api-token`.

### 2. JWT Authentication (User-based)

The Users & Permissions feature allows the management of the end-users of a Strapi project. It provides a full authentication process based on JSON Web Tokens (JWT) to protect your API, and an access-control list (ACL) strategy that enables you to manage permissions between groups of users.

- Users authenticate by sending a POST request to `/api/auth/local` with `identifier` (email or username) and `password`. The response includes a JWT token and user object.
- The JWT is then passed in subsequent requests via the `Authorization: Bearer <jwt>` header.
- By default, 2 end-user roles are defined: Authenticated (for logged-in users) and Public (for unauthenticated access). Custom roles can be created.
- Strapi provides two auth options: one social (Google, Twitter, Facebook, etc.) and another local auth (email and Password). Both of these options return a JWT token.

### 3. Third-Party Providers (Social Authentication)

The Users & Permissions feature allows enabling and configuring providers, for end users to login via a third-party provider to access the content of a front-end application through the Strapi application API. Providers such as Google, GitHub, Auth0, Facebook, and Twitter can be configured under **Settings → Users & Permissions → Providers**, each requiring their own Client ID and Client Secret.

**Important:** Strapi is self-hosted or hosted on Strapi Cloud, so the base URL of the API depends on the deployment (e.g., `https://your-strapi-instance.com`). All API endpoints are prefixed with `/api` by default.

## Features

### Content Management

Strapi allows defining custom content types (Collection Types and Single Types) with a flexible field system including text, numbers, media, relations, components, dynamic zones, and more. Data stored in the database using Strapi are turned into an API—either REST or GraphQL—that can then be consumed by the frontend part of your application. Through the API, you can create, read, update, and delete entries for any content type. Relations between content types can be defined and managed, and responses support field selection, filtering, sorting, and population of nested relations and components.

### Draft & Publish

Content types can have Draft & Publish enabled. When enabled, entries can exist in draft or published states. Entries can be published or unpublished via the API, allowing editorial workflows where content is prepared before going live.

### Media Management

Strapi includes a built-in media library (Upload plugin) for managing files such as images, videos, and documents. Media can be uploaded, retrieved, updated, and deleted through a dedicated API. Media can be associated with content entries through media fields.

### Internationalization (i18n)

Strapi 5 has i18n built into the core. Internationalization can be configured for each content type and/or field. Content can be created and fetched for specific locales using a `locale` query parameter on API requests. Content can only be managed one locale at a time. It is not possible to edit or publish content for several locales at the same time.

### Users & Permissions

Strapi provides full user management for end users including registration, login, password reset, and email confirmation. The built-in RBAC system provides granular control over user permissions using a Resource:Action pattern at both role and content-type levels. Custom roles can be created with fine-grained permissions on each content type's CRUD operations.

### GraphQL API

In addition to the REST API, Strapi can expose a GraphQL API (via plugin). It supports queries, mutations, and filtering with the same authentication mechanisms as REST.

## Events

Strapi webhooks enable you to exchange content with third-party applications when a specific event occurs. For example, webhooks are triggered when you create, update, or delete content. Webhooks are configured in the admin panel under **Settings → Webhooks**.

Each webhook is configured with a target URL, optional custom headers, and a selection of events to listen for. To prevent from unintentionally sending any user's information to other applications, Webhooks will not work for the User content-type.

### Entry Events

Events triggered when content type entries are modified:

- **entry.create** – Triggered when a new entry is created.
- **entry.update** – Triggered when an entry is updated.
- **entry.delete** – Triggered when an entry is deleted.
- **entry.publish** – Triggered when an entry is published. Only available when Draft & Publish is enabled.
- **entry.unpublish** – Triggered when an entry is unpublished. Only available when Draft & Publish is enabled.

The payload includes the event name, model name, timestamp, and the full entry data (excluding private fields and passwords).

### Media Events

Events triggered when media assets change:

- **media.create** – Triggered when you upload a file on entry creation or through the media interface.
- **media.update** – Triggered when a media asset is updated.
- **media.delete** – Triggered when a media asset is deleted.

### Release Events

- **releases.publish** – Triggered when a release is published (used with the Releases feature for batch publishing).

### Review Workflow Events (Enterprise only)

- **review-workflows.updateEntryStage** – This event is only available with the Enterprise edition of Strapi. The event is triggered when content is moved to a new review stage. The payload includes the workflow ID, source stage, and target stage.
