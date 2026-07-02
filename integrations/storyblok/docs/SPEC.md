Let me get the detailed webhook events list and more about the Management API features.Now let me get the Management API sidebar to understand all available resource types:Now I have comprehensive information to write the specification.

# Slates Specification for Storyblok

## Overview

Storyblok is a headless content management system (CMS) that provides APIs for creating, managing, and delivering structured content across multiple channels. It offers a Content Delivery API for reading published content, a Management API for full CRUD operations on content and space configuration, a GraphQL API for querying content, and an Image Service API for on-the-fly image transformation.

## Authentication

Storyblok supports multiple authentication methods depending on the API being accessed:

### Content Delivery API (read-only)

API requests must be authenticated by providing an access token as a query parameter. Two types of space-level tokens are available:

- **Public token**: Allows access to published content only (`version=published`).
- **Preview token**: Allows access to both draft and published content (`version=draft` and `version=published`).

Public and Preview tokens are read-only and do not allow you or others to write or delete entries in your space. These tokens are generated per space under **Settings → Access Tokens** in the Storyblok dashboard.

### Management API (read-write)

Use these tokens to perform CRUD (create, read, update, delete) operations via the Management API. Two token types are supported:

1. **Personal Access Token**:
   - A Personal Access Token is obtained from the Storyblok UI and grants access to all spaces associated with your account, including the Management API.
   - This token is used without the Bearer keyword in the Authorization header.
   - To manage existing tokens or generate new ones, open your Account settings: My account → Account settings → Personal access tokens.
   - Passed as: `Authorization: <YOUR_PERSONAL_ACCESS_TOKEN>`

2. **OAuth 2.0 Access Token**:
   - OAuth 2.0 allows Storyblok plugins to securely access resources by obtaining a Content Management API access token, specifically using the Authorization Code Grant Flow.
   - This token is tied to a single space. Obtain it via the OAuth2 authentication flow.
   - Permissions (scopes) such as `read_content` and `write_content` are granted during the OAuth process. This token must be used with the Bearer keyword in the Authorization header.
   - Authorization endpoint: `https://app.storyblok.com/oauth/authorize?client_id=<YOUR_CLIENT_ID>&response_type=code`
   - OAuth2 requires a `client_id` and `client_secret`, configured in Storyblok's Partner Portal under the app's OAuth 2 settings.
   - Passed as: `Authorization: Bearer <YOUR_OAUTH_TOKEN>`

### Region-specific base URLs

The Management API base URL depends on the space's server region:

- EU: `https://mapi.storyblok.com/v1`
- US: `https://api-us.storyblok.com/v1`
- Canada: `https://api-ca.storyblok.com/v1`
- Australia: `https://api-ap.storyblok.com/v1`
- China: `https://app.storyblokchina.cn/v1`

## Features

### Story (Content) Management

Create, read, update, delete, publish, unpublish, and duplicate stories (content entries). Stories hold structured content defined by components and can be organized in folders. Supports versioning with the ability to compare and restore previous versions, AI-powered translation, content scheduling for future publish dates, and import/export functionality. Stories can be filtered by slug, content type, publication status, and language.

### Content Delivery

Retrieve published or draft content for frontend consumption via REST or GraphQL. Supports filtering stories by custom field values using a rich set of filter operations (e.g., `is`, `in`, `like`, `gt_date`, `any_in_array`). Allows resolving relations between stories and retrieving content in specific languages for internationalized content.

### Component Management

Define and manage the content schema by creating, updating, and deleting components (content type definitions). Components define the fields and structure of stories. Supports component versioning and version restoration, and organizing components into folders.

### Asset Management

Upload, retrieve, update, replace, and delete media assets (images, documents, videos). Assets can be organized in folders, tagged with internal tags, and marked as private for restricted access. Supports bulk operations for moving and deleting assets. Asset metadata (including custom metadata fields) can be managed programmatically.

### Image Transformation

Transform and optimize images on the fly via URL-based parameters. Supports resizing, cropping, format conversion, quality adjustment, blur, brightness, grayscale, rotation, focal point, rounded corners, and fit-in operations.

### Datasources

Manage key-value data stores (datasources) and their entries. Useful for centralized option lists, configuration values, or structured data not tied to stories.

### Collaborator and Role Management

Add, remove, and manage collaborators (users) within a space. Create and configure custom space roles with granular permissions to control access to content and features.

### Workflows

Define and manage editorial workflows with custom stages. Move stories through workflow stages and track workflow stage changes. Supports approval processes for content review.

### Releases

Group content changes into releases that can be merged (published) together. Supports checking for conflicts within a release before merging.

### Discussions and Comments

Create discussions on stories for editorial collaboration. Add, update, and delete comments within discussions, and resolve discussions when issues are addressed.

### Tags and Internal Tags

Create and manage tags for organizing and categorizing stories. Internal tags can be used for assets and components for organizational purposes.

### Spaces

Create, retrieve, update, duplicate, delete, and back up spaces. A space is the top-level organizational container for all content and configuration.

### Pipelines (Branching)

Create and manage content pipeline branches for staging environments, allowing content to be developed and deployed across different stages.

### Tasks

Create automation tasks that can trigger webhooks when executed, with optional user input dialogs that pass custom values as payload.

### Extensions and Field Plugins

Manage custom extensions (apps/plugins) and field plugins that extend the Storyblok editing experience. Retrieve and update extension settings.

### Activities

Retrieve an audit log of activities (actions taken by users) within a space for tracking content changes and user actions.

## Events

In Storyblok, webhooks notify external services of events, such as when content is published or updated. This is useful for tasks like clearing caches or triggering build processes.

Webhooks are configured per space under **Settings → Webhooks**. Each webhook requires a target URL and a selection of event types. The sender of the webhook can be verified by validating the signature sent along with the payload and generated with a shared secret key (webhook secret). Webhooks don't retry on failure.

### Story Events

Triggered when content stories change state.

- **published**: A story is published.
- **unpublished**: A story is unpublished.
- **deleted**: A story is deleted.
- **moved**: A story is moved.

### Datasource Events

Triggered when datasource entries are modified.

- **entries_updated**: A datasource entry is saved or added.

### Asset Events

Triggered when media assets change.

- **created**: An asset is uploaded.
- **replaced**: An asset is replaced.
- **deleted**: An asset is deleted.
- **restored**: An asset is restored.

### User Management Events

Triggered when collaborator membership changes within a space.

- **added**: A user is added to the space.
- **removed**: A user is removed from the space.
- **roles_updated**: A user's role is updated.

### Workflow Events

Triggered when a story moves through workflow stages.

- **stage.changed**: The workflow stage of a story changed.

### Discussion Events

Triggered when editorial discussions or comments change.

- **created**: A discussion is created.
- **comment_created**: A comment is added.
- **comment_updated**: A comment is updated.
- **comment_deleted**: A comment is deleted.
- **resolved**: A discussion is resolved.

### Pipeline Events

Triggered when pipeline stages are deployed. Requires the Pipelines App.

- **deployed**: A pipeline stage is deployed.

### Release Events

Triggered when releases are merged. Requires the Releases App.

- **merged**: A release is merged into the current released content.

### Task Events

Triggered manually via the Tasks App when a user clicks Execute on a task.

- **task_execution**: A task webhook is triggered, optionally including user-provided `dialog_values` in the payload.
