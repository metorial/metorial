Let me fetch the OpenAPI spec and the developer docs for more details on features and webhooks.Now let me check the webhook and custom content/tiles documentation:Based on the API reference page, the API tracker shows webhooks are listed with a dash (meaning not available). Let me look at the detailed API reference more carefully to check for the Ask index feature and any other details.Now I have a comprehensive understanding of the Slite API. Let me compile the specification.

# Slates Specification for Slite

## Overview

Slite is an AI-powered knowledge base platform for teams to create, organize, and share internal documentation. It provides a collaborative editor with collections-based organization, AI-powered search and Q&A ("Ask"), and document verification workflows.

## Authentication

Every call to the Slite public API has to be authenticated with a personal API key, generated in your settings. This API key authorizes access to all the user's content.

**How to generate an API key:**

1. Open the organization menu at the top left of the Slite app
2. Click on Settings
3. In the left panel, click on API
4. Click "Create a new key" and follow the instructions

The API key will only be displayed once, so make sure to save it. You can request multiple API keys and revoke any that are not being used.

**How to authenticate requests:**

Pass the API key as an `x-slite-api-key` header on all requests to the base URL `https://api.slite.com/v1/`.

Example:

```
curl --header 'x-slite-api-key: <API Key>' \
     https://api.slite.com/v1/notes
```

There is no OAuth2 flow or other authentication method available. The API key is scoped to the generating user's access level.

## Features

### Document (Note) Management

Create, read, update, and delete notes (documents) in the workspace. Notes support markdown content, can be organized in parent-child hierarchies, and can be created from templates. You can retrieve child notes of any parent note and list all notes in the workspace.

- Notes can be assigned a title, markdown body, parent note ID, template ID, and custom attributes.
- Deleting a note also deletes all its children.

### AI-Powered Question Answering (Ask)

Ask questions to your knowledge base in natural language using Slite's AI assistant. The scope of results is restricted to the authenticated user's accessible content, with optional additional filters to narrow results further.

### Custom Content Indexing

Index external custom content into Slite's AI knowledge base so that the Ask feature can reference it when answering questions. You can add, list, and delete custom indexed content. This allows you to extend the AI's knowledge beyond native Slite documents.

### Document Lifecycle Management

Manage the status and lifecycle of documents:

- **Verification**: Mark a note as verified to signal that its content is up-to-date and trustworthy.
- **Flag as outdated**: Flag a note as outdated to indicate it needs review.
- **Archiving**: Archive or unarchive notes to manage workspace clutter.
- **Ownership**: Update the owner of a note, useful for assigning responsibility for content maintenance.

### Knowledge Management

Access specialized views of workspace content for knowledge governance purposes. List all notes, publicly shared notes, inactive notes, and empty notes. Useful for auditing content health and identifying stale or missing documentation.

### Search

Search notes by keyword across the workspace. Results are scoped to content accessible by the authenticated user.

### Tile Updates

Update individual tiles (content blocks) within a note. This enables pushing dynamic or external data into specific sections of a document without replacing the entire note content.

### User and Group Management

Look up users by ID or search for users, and similarly look up groups by ID or search for groups. Useful for resolving ownership, assigning note owners, or building integrations that reference team members.

## Events

The provider does not support events. Slite's API does not offer a webhooks management API, and there is no documented webhook or event subscription mechanism in the API reference. Integrations that need event-driven behavior typically rely on third-party platforms like Zapier.
