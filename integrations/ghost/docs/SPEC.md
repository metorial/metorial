Now let me get the Content API docs for completeness:# Slates Specification for Ghost

## Overview

Ghost is an open-source publishing platform built on Node.js for blogging, newsletters, memberships, and paid subscriptions. It exposes two main APIs: a read-only Content API for delivering published content, and a full Admin API for managing all aspects of the site including posts, pages, members, and settings.

## Authentication

Ghost provides separate authentication mechanisms for its two APIs:

### Content API (Read-Only)

Content API keys are provided via a query parameter in the URL. These keys are safe for use in browsers and other insecure environments, as they only ever provide access to public data.

- **Key format**: A simple API key string appended as `?key={key}` to the request URL.
- **Base URL**: `https://{admin_domain}/ghost/api/content/`
- Obtain the Content API URL and key by creating a new Custom Integration under the Integrations screen in Ghost Admin.

### Admin API

There are three methods for authenticating with the Admin API: integration token authentication, staff access token authentication and user authentication.

#### 1. Integration Token Authentication (recommended for integrations)

Integration Token authentication is intended for integrations that handle common workflows, such as publishing new content, or sharing content to other platforms. Using tokens, you authenticate as an integration. Each integration can have associated API keys & webhooks and are able to perform API requests independently of users. Admin API keys are used to generate short-lived single-use JSON Web Tokens (JWTs), which are then used to authenticate a request. The API Key is secret, and therefore this authentication method is only suitable for secure server side environments.

- **Key format**: The Admin API key is in the format `{id}:{secret}`, separated by a colon.
- **Token generation**: Split the key into `id` and `secret`. Use the `id` as the JWT `kid` header, decode the hex `secret`, and sign a JWT with HS256. The payload must include `iat`, `exp` (max 5 minutes), and `aud` set to `"/admin/"`.
- **Authorization header**: `Authorization: Ghost {token}`
- **Base URL**: `https://{admin_domain}/ghost/api/admin/`
- Admin API keys are created by adding a Custom Integration under Settings > Integrations in Ghost Admin.

#### 2. Staff Access Token Authentication

Staff access token authentication is intended for clients where different users login and manage various resources as themselves, without having to share their password. Using a token found in a user's settings page you authenticate as a specific user with their role-based permissions. You can use this token the same way you would use an integration token.

#### 3. User Authentication (Session-Based)

User authentication is intended for fully-fledged clients where different users login and manage various resources as themselves. Using an email address and password, you authenticate as a specific user with their role-based permissions. Via the session API, credentials are swapped for a cookie-based session, which is then used to authenticate further API requests. Provided that passwords are entered securely, user-authentication is safe for use in the browser. User authentication requires support for second factor authentication codes.

- **Endpoint**: `POST /ghost/api/admin/session/` with `username` (email) and `password`.
- May return a 403 requiring a 2FA verification code via `PUT /ghost/api/admin/session/verify/`.
- Requires an `Origin` header for CSRF protection.

### Permissions

Secure authentication is available either as a user with role-based permissions, or as an integration with a single standard set of permissions designed to support common publishing workflows. Authenticating as a user with the Owner or Admin role will give access to the full set of API endpoints.

## Features

### Content Reading (Content API)

The Content API provides access to Posts, Pages, Tags, Authors, Tiers, and Settings. Ghost's RESTful Content API delivers published content to the world and can be accessed in a read-only manner by any client to render in a website, app, or other embedded media. This is ideal for headless CMS use cases where Ghost serves as a backend for external frontends.

### Post and Page Management (Admin API)

Create, read, update, copy, and delete posts and pages. Posts support draft, published, and scheduled states. Content can be provided in Lexical (default), MobileDoc, or HTML format. Posts can be marked as featured and assigned visibility levels (public, members, paid).

### Tag Management

Create, read, update, and delete tags. Tags can be attached to and detached from posts and pages to organize content.

### Member Management

Browse, read, add, and edit members (subscribers). Members can have free or paid subscriptions. Member records include details like email, name, subscription status, and associated labels/tiers. Members can be imported via CSV, though this has limitations (e.g., webhooks may not fire on CSV imports).

### Tiers and Offers

Manage membership tiers (pricing levels) and promotional offers. Tiers define access levels for content and can have monthly/yearly pricing. Offers allow creating discounts or trials for specific tiers.

### Newsletter Management

Browse, read, add, and edit newsletters. Ghost supports multiple newsletters, each configurable independently.

### User/Staff Management

Read-only access to user/staff data via the Admin API. User permissions are role-based (Contributor, Author, Editor, Administrator, Owner).

### Image Upload

Upload images to the Ghost instance for use in posts, pages, and site settings.

### Theme Management

Upload and activate themes. Themes control the front-end appearance of a Ghost site.

### Site Settings

Read site-level metadata and configuration including title, description, navigation, and other global settings.

### Webhook Management via API

Programmatically create, edit, and delete webhooks through the Admin API, enabling dynamic registration of event listeners.

## Events

Webhooks are specific events triggered when something happens in Ghost, like publishing a new post or receiving a new member. Configuring webhooks can be done through the Ghost Admin user interface under Settings > Advanced > Integrations > Add custom integration. The only required fields to setup a new webhook are a trigger event and target URL to notify. Webhooks can also be created programmatically via the Admin API.

### Site Changes

- `site.changed` — Triggered whenever any content changes in site data or settings. Useful for triggering static site rebuilds.

### Post Events

- `post.added`, `post.edited`, `post.deleted` — Content lifecycle events for posts.
- `post.published`, `post.published.edited`, `post.unpublished` — Publishing workflow events.
- `post.scheduled`, `post.unscheduled`, `post.rescheduled` — Scheduling workflow events.

### Page Events

- `page.added`, `page.edited`, `page.deleted` — Content lifecycle events for pages.
- `page.published`, `page.published.edited`, `page.unpublished` — Publishing workflow events.
- `page.scheduled`, `page.unscheduled`, `page.rescheduled` — Scheduling workflow events.

### Tag Events

- `tag.added`, `tag.edited`, `tag.deleted` — Triggered when tags are created, modified, or removed.
- `post.tag.attached`, `post.tag.detached` — Triggered when tags are associated with or removed from posts.
- `page.tag.attached`, `page.tag.detached` — Triggered when tags are associated with or removed from pages.

### Member Events

- `member.added`, `member.edited`, `member.deleted` — Triggered when members are created, modified, or removed.
- Importing a CSV file does NOT seem to trigger the member-added webhook, nor the member-updated webhook.
