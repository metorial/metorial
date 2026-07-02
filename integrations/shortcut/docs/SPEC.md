Now let me get more details on the API features by looking at the REST API documentation:# Slates Specification for Shortcut

## Overview

Shortcut (formerly Clubhouse) is a project management platform built for software development teams. It provides issue tracking, sprint planning, roadmaps, and goal-setting through a hierarchy of Stories, Epics, Objectives, and Iterations. The platform offers a REST API (v3) for programmatic access to all workspace data and an outgoing webhook system for event-driven integrations.

## Authentication

Shortcut uses token-based authentication. API tokens can be generated at `https://app.shortcut.com/settings/account/api-tokens`.

API tokens are both user-specific and workspace-specific. Tokens provide complete access to your Shortcut workspace.

The token is passed via the `Shortcut-Token` HTTP header on every request:

```
Shortcut-Token: YOUR_API_TOKEN
```

All requests must be made over HTTPS. Requests made with a missing or invalid token will get a 401 Unauthorized response.

There are no OAuth flows or scopes — a single API token grants full access to all resources in the workspace on behalf of the user who generated it. If the user account that created the API token is removed from the workspace, that API token will no longer work.

The base URL for all API requests is: `https://api.app.shortcut.com/api/v3/`

## Features

### Story Management

Stories represent individual pieces of work and are the foundation of work in Shortcut. The API allows creating, reading, updating, deleting, and searching stories. Stories support types (Feature, Bug, Chore), estimates, deadlines, owners, followers, labels, custom fields, sub-tasks, and file attachments. Stories can have sub-tasks that move through the team's workflow and connect to GitHub.

- Stories can be linked to epics, iterations, teams, and projects.
- Story relationships (blockers/blocked) can be managed.
- Comments and tasks (checklists) on stories can be created and managed.
- The API supports story templates for standardized story creation.

### Epic Management

An Epic is a collection of Stories representing a larger body of work or feature. Epics contain Stories from different teams and workflows. The API supports full CRUD operations on epics, including managing their workflow states, labels, owners, deadlines, and associated stories. An Epic can belong to more than one Objective.

### Objectives (formerly Milestones)

Milestones are now called Objectives. Objectives are your company's top-level strategic goals. They connect day-to-day work to broader outcomes your organization is driving toward. There are two types: Strategic Objectives (which include key results to monitor targets and outcomes) and Tactical Objectives (which directly connect to tasks and projects). The API supports managing objectives, their categories, and key results.

- The legacy Milestones API endpoints are still available but map to Objectives.

### Iterations (Sprints)

An Iteration is a time-boxed period of development for a collection of Stories that can span multiple Epics and Workflows, and can be used to track sprint cycles. The API allows creating and managing iterations with start/end dates, and assigning stories and teams to them.

### Workflows and Workflow States

A Workflow is a set of States customized by your organization through which Stories and Epics move from creation to completion. Workflow States track progress with Kanban boards. A Workflow can be customized specifically to fit each team's process. The API provides read access to workflows and their states.

### Teams (Groups)

A "group" in the API maps to a "Team" in the Shortcut product. A Team is a collection of Users that can be associated to Stories, Epics, and Iterations. Each entity can only be associated directly with one Team — two Teams cannot be added to the same Story, Epic, or Iteration.

### Labels and Categories

Labels can be created and applied to Stories and Epics for organization and filtering. Categories are used to group Objectives. Both are fully manageable through the API.

### Custom Fields

Custom Fields provide the ability to organize Stories by Priority, Severity, Technical Area, Skill Set, and Product Area with structured, searchable fields. The API supports listing, creating, updating, and deleting custom field definitions and their values.

### Documents (Docs)

Shortcut introduced Docs, a documentation system tightly integrated with the platform to help teams capture and share long-form documentation such as design documents and product strategies. Companies can use it to create and collaborate on documents in real time. The API supports creating, reading, updating, and deleting documents with content in Markdown or HTML format.

### Search

The API provides a search endpoint that accepts a query string with rich search operators. There are two categories of search operators: story-specific operators and general operators which find results across Stories, Epics, and Objectives. Searches can filter by workflow state, owner, label, epic, iteration, dates, custom fields, and more.

### Members and Workspace

The API allows retrieving workspace member information, the current authenticated member's details, and workspace-level settings.

### Files and Linked Files

Files can be uploaded and attached to stories. Linked files (references to external files in services like Google Drive or Dropbox) can also be managed.

## Events

Shortcut supports outgoing webhooks that fire on workspace changes.

### Webhook Setup

You can use the REST API to programmatically register webhooks that receive updates via Shortcut's Webhooks API. Webhooks are registered by providing a payload URL and an optional secret for signature verification. If you provide a secret, events will include an HTTP header named `Payload-Signature`, computed using HMAC-SHA-256.

### Story and Epic Events

Shortcut's outgoing webhooks fire whenever Stories or Epics are created, updated, or deleted. This includes:

- **Create/Update/Delete** on Stories and Epics
- **Comment changes** — additions, edits, and deletions on story and epic comments
- **Task/checklist changes** — creation, completion, and deletion of tasks
- **Workflow state changes** — including changes initiated by version control integrations (e.g., GitHub)
- **Field changes** — changes to owners, estimates, deadlines, labels, iterations, and other attributes

The actions array represents changes to Shortcut objects in your workspace, including changes to the primary object and other objects affected by the event. Each action has an `entity_type` field with values like "story" or "epic", and an `action` field describing the type of action like "update" or "create". The changes object includes details of the changes, e.g., the old and new values of attributes that were changed in the event.

- Webhooks cannot be filtered to specific event types — all workspace changes are sent to the registered URL.
- A `references` array provides context for IDs mentioned in the changes (e.g., workflow state names).
