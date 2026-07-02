Now let me get more details on the webhook entity types and their specific event types:Now I have all the information needed. Let me compose the specification.

# Slates Specification for DatoCMS

## Overview

DatoCMS is a cloud-based headless CMS that allows teams to create, manage, and deliver structured content across multiple platforms via APIs. It provides a REST-based Content Management API for programmatic content operations and a GraphQL-based Content Delivery API for frontend content retrieval, along with media asset management, localization, and environment management.

## Authentication

DatoCMS uses **API token-based authentication** for all its APIs.

- In order to make any request to the Content Management API (CMA), you need to first obtain an API token.
- Every project comes with a read-only API token by default. If you need to perform other types of requests — like writing or deleting content — you can create a custom API token with the appropriate permissions.
- You can use roles to define granular access levels and control exactly what each token can do.

**How to obtain a token:**
Navigate to your project's administrative area at `https://your-project.admin.datocms.com` and go to **Project Settings > API Tokens**.

**How to use the token:**
Once you have the API Token, you need to pass it as an `Authorization` header in each HTTP request you perform. The header format is:

```
Authorization: Bearer <YOUR_API_TOKEN>
```

**APIs and endpoints:**

- **Content Management API (REST):** `https://site-api.datocms.com` — Used for creating, updating, and deleting content and schema.
- **Content Delivery API (GraphQL):** `https://graphql.datocms.com` — Read-only API for fetching content. The Real-time Content API supports exactly the same authentication method, endpoints and GraphQL queries, but uses the endpoint `https://graphql-listen.datocms.com`.

If you want to restrict GraphQL access only to a selection of your models, you can generate a custom API token and assign it a custom role.

There is no OAuth2 flow. All authentication is done via static API tokens with role-based permissions.

## Features

### Content Management

The Content Management API (CMA) is used to manage the content of your DatoCMS projects. This includes creating, updating, deleting, and fetching content of your projects. Records (content entries) are instances of models, and their shape depends on the fields defined in each model.

- Supports draft/published workflow with scheduled publishing and unpublishing.
- Localization allows you to store different versions of your content for different languages or regions. When you mark a field as "localizable" in your model, its structure in the API changes to accommodate multiple values.
- Record versioning is available to track changes over time.

### Content Delivery (GraphQL)

The Content Delivery API is used to retrieve content from one of your DatoCMS projects and deliver it to your web or mobile projects. The APIs serve content via a powerful and robust content delivery network (CDN).

- Read-only GraphQL API allowing clients to request exactly the data they need.
- Supports fetching draft or published versions of records via request headers.
- Can target specific environments via the `X-Environment` header.

### Real-Time Updates

A call to the Real-time Content API returns the URL of a persistent channel implementing the Server-Sent Events protocol. Immediately after the connection, the channel will send an update event with the result of the GraphQL query. The same event will then be sent every time the result of the query changes due to a change of the underlying content.

### Schema Management (Models & Fields)

The API lets you manage other aspects of your account and projects, such as roles & permissions, environments, collaborators, and more. You can programmatically create, update, and delete content models, fields, and fieldsets that define the structure of your content.

### Media / Upload Management

DatoCMS provides full CRUD operations for media assets (uploads). The platform includes a dedicated Images API and Video API. These tools handle asset optimization, resizing, and delivery. Uploads support permissions, tagging (manual and smart), collections, and tracking.

### Environment Management

DatoCMS supports primary and sandbox environments. You can create, fork, and promote environments programmatically, enabling safe schema migrations and testing before going live.

### Roles, Permissions & Collaboration

Manage API tokens, roles, collaborators, and invitations. Tokens can be scoped to specific roles that restrict access to certain models or actions. SSO settings and user management are also available for enterprise projects.

### Build Triggers & Deployment

Configure build triggers to automatically kick off deployments to hosting providers (e.g., Vercel, Netlify, Cloudflare Pages) when content changes. Deploy activity can be tracked via the API.

### Site Search

DatoCMS offers a built-in site search feature that crawls your published website and exposes search results through the API.

### Plugins

The DatoCMS Plugins SDK lets your developers customize the DatoCMS UI itself, extending functionality for your editors by easily integrating third-party services or adding special logic for your specific business needs.

## Events

DatoCMS supports webhooks that send HTTP POST notifications when specific events occur in a project. Webhooks are configured under **Project Settings > Webhooks** and can target any URL with optional HTTP basic authentication and custom headers.

Each webhook can have multiple triggers, and payloads can be customized using the Mustache templating language. Automatic retry (up to 7 attempts) is optionally available.

### Record Events

Events: `create`, `update`, `delete`, `publish`, `unpublish`

- Triggered when content records are created, modified, deleted, published, or unpublished.
- Can be filtered to trigger only for specific records or records belonging to specific models.
- For `update` events, the payload includes both the previous and current state of the record.
- Behavior varies depending on whether the model has the draft/publish system enabled.

### Model Events

Events: `create`, `update`, `delete`

- Triggered when content models are created, modified, or deleted.
- Changes to a model's fields also trigger an update event.
- Can be filtered to trigger only for specific models.

### Upload Events

Events: `create`, `update`, `delete`

- Triggered when media assets are created, modified, or deleted.

### Build Trigger Events

Events: `deploy_started`, `deploy_succeeded`, `deploy_failed`

- Triggered when a deployment build starts, succeeds, or fails.

### Environment Events

Events: `deploy_started`, `deploy_succeeded`, `deploy_failed`

- Triggered when environment-related deployment operations start, succeed, or fail.

### Maintenance Mode Events

Events: `change`

- Triggered when an admin activates or deactivates maintenance mode on the project.

### SSO User Events

Events: `create`

- Triggered when an SSO user is added to a project as a collaborator.

### CDA Cache Tags Events

Events: `invalidate`

- Triggered when Content Delivery API cache tags need to be invalidated, useful for triggering revalidation in frontend frameworks.
