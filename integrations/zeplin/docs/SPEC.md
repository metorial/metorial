# Slates Specification for Zeplin

## Overview

Zeplin is a design delivery platform that bridges the gap between designers and developers. It allows teams to publish designs from tools like Figma and Sketch, then provides developers with specs, assets, code snippets, and design tokens. The API provides access to projects, screens, components, styleguides, notes, and related design resources.

## Authentication

Zeplin supports two authentication methods:

### 1. Personal Access Token

To use the Zeplin API, you either need to create a personal access token or a Zeplin app. You can create a personal access token from the web app under the Developer tab in your profile page. You can use this token to make API calls for your own Zeplin account.

The token is passed as a Bearer token in the `Authorization` header.

### 2. OAuth 2.0 (Authorization Code Grant)

Zeplin apps use OAuth 2.0 to establish a connection between a Zeplin user and app's access to the API on behalf of the user. Zeplin API supports authorization code grant to generate tokens.

The OAuth flow works as follows:

There are 3 steps to authorize a Zeplin app: Users are redirected to Zeplin's web app to authenticate themselves and authorize the Zeplin app. Users are redirected back to your redirect URI by Zeplin with a code parameter. Your app requests an access token using the code parameter.

**Endpoints:**

- Authorization: `GET https://api.zeplin.dev/v1/oauth/authorize`
  - Required parameters: `client_id`, `redirect_uri`
  - Optional parameters: `state`, `code_challenge`, `code_challenge_method`
- Token exchange: `POST https://api.zeplin.dev/v1/oauth/token`
  - Parameters: `grant_type` (`authorization_code` or `refresh_token`), `code`, `redirect_uri`, `client_id`, `client_secret` (or `code_verifier` for PKCE)

Zeplin API supports PKCE extension for OAuth 2.0 to securely generate tokens for public clients. Since using client_secret of your Zeplin app inside a public client would be insecure, PKCE authorization flow allows you to avoid using it.

To create a Zeplin app (which provides the `client_id` and `client_secret`), go to the Developer tab in your profile page at `https://app.zeplin.io/profile/developer`.

Zeplin's OAuth implementation does not use granular scopes — the token inherits the permissions of the authorizing user.

## Features

### Project Management

Zeplin API provides a wide range of capabilities for you to access the data in Zeplin. It lets you read all the resources including projects, screens, components, layers, assets, notes and so on. You can list, retrieve, and update projects, as well as manage project members (invite and remove).

### Screen Management

Create, retrieve, and update screens within projects. Access screen versions (including publishing new versions with PNG/JPEG images), screen sections, and screen variants. With the Publish API endpoints, you can build your custom integrations to add any PNG and JPEG files to Zeplin projects.

### Notes, Comments & Annotations

Create, read, update, and delete notes on screens with configurable position and color. Add comments (replies) to notes. Manage screen annotations with custom note types.

### Design Tokens & Styles

Access and manage colors, text styles, and spacing tokens at both the project and styleguide level. Retrieve exported design tokens in a structured format. Create and update colors at the project or styleguide level.

### Components

Read and update components within projects and styleguides. Access component versions, sections, and pages. Retrieve connected components that link design components to code repositories.

### Styleguides

List, retrieve, and update styleguides. Manage styleguide members. Access linked projects. Styleguides serve as shared design system libraries that can be linked to multiple projects.

### Flows

Access flow boards within projects, including flow board nodes (screens, shapes, text, annotations), connectors between nodes, and groups. Flows represent user journey maps or navigation diagrams.

### Variable Collections

Retrieve variable collections from projects and styleguides, which contain design variables with multiple modes (e.g., light/dark themes).

### Organization & Team Management

Using the Team Management API, you can now automate this process to sync any changes in your team's people directory to your Zeplin workspace. Quickly add new members, remove or update the existing members of your workspace. Access organization details, billing information, workflow statuses, and member project/styleguide assignments.

### Notifications

Retrieve and manage user notifications within Zeplin, including bulk-updating notification read status.

## Events

Webhooks provide a mechanism to receive notifications whenever particular changes happen so that you can take necessary actions on your end. It enables creating apps that react to changes in Zeplin in real-time.

Webhooks can be created for workspaces in Zeplin. Once created, it will deliver an HTTP request for every event happening in the workspace. You can specify the events that you plan to use in your application and even subscribe only to specific projects and styleguides within the workspace.

Webhooks can also be created programmatically via the API at the organization, project, styleguide, or user level. Each webhook requires a URL endpoint and a shared secret for signature verification.

### Workspace Events

- **Workspace Notification** — Triggered when workspace-level notifications occur.
- **Workspace Project** — Triggered when projects are created, updated, or removed within the workspace.
- **Workspace Styleguide** — Triggered when styleguides are created, updated, or removed within the workspace.
- **Workspace Organization** — Triggered when organization-level settings change.
- **Workspace Organization Member** — Triggered when members are added, removed, or have their roles updated in the organization.

### Project Events

- **Project Member** — Triggered when members are added to or removed from a project.
- **Project Screen** — Triggered when screens are created, updated, or deleted in a project.
- **Project Screen Version** — Triggered when new screen versions are published.
- **Project Note** — Triggered when notes are created, updated, or deleted on screens.
- **Project Note Comment** — Triggered when comments (replies) are added to notes.
- **Project Color** — Triggered when colors are created or updated in a project.
- **Project Text Style** — Triggered when text styles are created or updated.
- **Project Component** — Triggered when components are created or updated.
- **Project Flow Board** — Triggered when flow boards change.
- **Project Spacing Token** — Triggered when spacing tokens are created or updated.

### Styleguide Events

- **Styleguide Member** — Triggered when members are added to or removed from a styleguide.
- **Styleguide Color** — Triggered when colors are created or updated in a styleguide.
- **Styleguide Text Style** — Triggered when text styles are created or updated.
- **Styleguide Component** — Triggered when components are created or updated.
- **Styleguide Spacing Token** — Triggered when spacing tokens are created or updated.
