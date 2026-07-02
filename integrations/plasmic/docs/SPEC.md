Now let me get more details on the Write API:# Slates Specification for Plasmic

## Overview

Plasmic is a visual web design and development platform that allows users to build pages, components, and full applications visually. It provides a headless CMS, server-side rendering of components via REST APIs, and a programmatic write API for updating projects. Plasmic integrates with React-based frameworks and can be used as both a design tool and a content management system.

## Authentication

Plasmic uses API key-based authentication. There are two separate API systems, each with its own authentication mechanism:

### Project API (Render API / Write API / Model API)

Used for rendering components, reading project models, and updating projects.

- **Header**: `x-plasmic-api-project-tokens`
- **Value format**: `PROJECTID:TOKEN`
- **Token types**:
  - **Public API Token** (for read operations like rendering): Found at `https://studio.plasmic.app/projects/[PROJECTID]/docs/loader#showToken=true`
  - **Secret Token** (for write operations): Currently only available for enterprise customers
- **Base URL (Render/Model)**: `https://codegen.plasmic.app/api/v1/`
- **Base URL (Write)**: `https://studio.plasmic.app/api/v1/projects/`

### CMS API

Used for managing content in the Plasmic CMS.

- **Header**: `x-plasmic-api-cms-tokens`
- **Value format**: `CMS_ID:TOKEN`
- **Token types**:
  - **Public Token**: For read operations (e.g., querying items)
  - **Secret Token**: For write operations (e.g., creating, updating, deleting items). Must only be used server-side.
- **Base URL**: `https://data.plasmic.app/api/v1/cms/databases/`
- CMS ID, Public Token, and Secret Token are found in the "CMS Settings" tab of the Plasmic dashboard.

## Features

### Component Rendering (Render API)

Render Plasmic-designed pages and components as HTML via a REST API. This allows embedding Plasmic content in any application that can make HTTP requests, regardless of framework.

- Supports three rendering modes: `preview` (latest revisions), `published` (only published changes), and `versioned` (specific version).
- Component props and global variants can be customized via query parameters.
- Optional JavaScript hydration can be included for interactive components.
- Rendering happens on Plasmic's servers, so custom code components are not available in this mode.

### Project Model Access (Model API)

Retrieve a JSON representation of the full project structure, including all components, pages, design tokens, and metadata.

- Returns the complete element tree (TplNodes) for each component and page.
- Includes metadata about A/B tests, custom targets, and scheduled content (splits).
- Supports the same `preview`, `published`, and `versioned` modes as the Render API.

### Project Updates (Write API)

Programmatically create and update components, pages, and design tokens in a Plasmic project.

- Create new components or pages with specified content (element trees).
- Update existing components by matching on UUID, name, or path.
- Create or update design tokens (colors, spacing, fonts, shadows, etc.).
- Secret token required; currently only available to enterprise customers.

### CMS Content Management

Full CRUD operations on content stored in Plasmic's built-in headless CMS.

- **Query items**: Load all items or filter by field conditions using a JSON-based query syntax with logical operators (`$and`, `$or`, `$not`) and conditional operators.
- **Count items**: Get the count of items matching filter criteria.
- **Create items**: Add new content entries to a CMS model.
- **Update items**: Modify existing content entries.
- **Delete items**: Remove content entries.
- **Publish items**: Publish draft items.
- Supports loading draft versions of items (requires secret token).
- Supports localized content retrieval.

## Events

### Project Publish Webhooks

Plasmic can call configured webhooks when an editor publishes a project. These are configured in the Plasmic Studio publish dialog.

- Each webhook can be configured with a custom URL and HTTP method.
- Optionally includes a payload with the list of changed pages (`pagesChanged`) and changed imported projects/libraries (`importedProjectsChanged`).
- Supports configuring multiple webhooks per project (e.g., separate staging and production webhooks).

### CMS Publish Webhooks

Plasmic supports webhooks that are triggered when a CMS entry is published, enabling integration with external systems upon content changes.
