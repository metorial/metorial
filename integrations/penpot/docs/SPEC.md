Let me get more details on the specific API features available.# Slates Specification for Penpot

## Overview

Penpot is an open-source design and prototyping platform for design and code collaboration. It works with open standards (SVG, CSS, HTML) and can be used as a SaaS at design.penpot.app or self-hosted. Penpot offers integration into the development toolchain, thanks to its support for webhooks and an API accessible through access tokens.

## Authentication

Penpot supports authentication via **Personal Access Tokens**.

Personal access tokens function like an alternative to our login/password authentication system and can be used to allow an application to access the internal Penpot API.

**Generating a token:**

To manage your access tokens, go to Your account > Access tokens. Press the "Generate new token" button. Fill the name of the token. Descriptive names are recommended. Choose an expiration date. Current options are: Never, 30 days, 60 days, 90 days or 180 days. Once you're happy with the name and the expiration date, press "Create token". At this step you will be able to copy the token to your clipboard.

**Using the token:**

The token is passed via the `Authorization` header with the `Token` prefix. Example:

```
Authorization: Token <your-access-token>
```

**Base URL:**

- For the SaaS instance: `https://design.penpot.app`
- For self-hosted instances: your custom domain

The backend RPC API URLs are changed from `/api/rpc/command/<name>` to `/api/main/methods/<name>`. The previous path is preserved for backward compatibility; however, if you are a user of this API, it is strongly recommended that you adapt your code to use the new path.

**Self-hosted note:** Access tokens must be enabled in the Penpot server configuration by adding `enable-access-tokens` to the `PENPOT_FLAGS` environment variable.

## Features

### Profile Management

Retrieve and update the current user's profile information (name, email, avatar, etc.).

### Team Management

At Penpot you can create and join as many teams as you need and add all necessary stakeholders with no team size limits. At Penpot you can create as many teams as you need and be invited to teams owned by others. The API allows listing teams, retrieving team details, managing team members, invitations, and getting team statistics. Teams support role-based access with Viewer, Editor, Admin, and Owner roles.

### Project Management

Projects act as containers for grouping design files within a team. The API allows creating, listing, searching, and managing projects.

### File Management

Create new design files, list projects, and manage file metadata. The API supports creating files, retrieving file data (including full design structure), updating files with changes, listing recently accessed files, and searching files by name. File permissions can also be queried.

### Page Management

Files contain pages. The API allows adding, removing, and organizing pages within design files.

### Shape Operations

Shape Operations: Create rectangles, circles, frames, paths, text, and SVG shapes. Modify Designs: Update shape properties, move objects, resize, rotate, and style. Shapes can be queried and filtered by type, area, color, font, or text content. Detailed shape properties (colors, text, fonts, effects) can be retrieved.

### Component System

Create and manage reusable design components. Components can be searched by name across files and libraries.

### Design Tokens

Export your design tokens from Penpot into ready-to-use code or parseable data files. The API provides access to design tokens, supporting design-to-code workflows.

### Media Assets

Upload and manage media assets (images, fills) associated with design files.

### Comments

Add and retrieve comments on design files, enabling collaboration and feedback within the design workflow.

### File Export

Export design data, including the ability to export files in Penpot's native format (.penpot) for import/migration.

## Events

Penpot supports **outbound webhooks** for event notifications.

When you add a webhook, you specify the URL of a service you own. If the webhook is active, a POST request will be sent to the URL on any event that occurs anywhere in the team.

**Configuration options:**

- You can specify the format of the call payload. JSON is a standard format, accepted by almost every web application. Transit is a format, that may be encapsulated inside JSON, that adds datatype information and enriches the content with semantic information.

Webhooks are configured at the team level. There is no specific documentation for the webhooks yet. For the moment you can use the backend API documentation, generated automatically from source code, as a guide. All backend RPC calls labelled as WEBHOOK trigger webhook calls, if appropriate, with an equivalent payload.

### File Events

Notifications when design files are created, updated, or deleted within a team.

### Comment Events

Notifications when comments are added or modified on design files.

### Project Events

Notifications when projects are created, modified, or deleted.

### Team Membership Events

Notifications related to team membership changes (invitations, role changes).

**Limitations:** Webhooks fire for all events across the entire team — there is no per-file or per-event-type filtering. The exact set of event types is not formally documented and is derived from the backend RPC calls marked as webhook-triggering.
