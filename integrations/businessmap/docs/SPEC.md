Let me get more details on the API V2 features.Now I have enough information to write a comprehensive specification.

# Slates Specification for Kanbanize

## Overview

Kanbanize (now rebranded as Businessmap) is a Kanban-based project management and workflow platform designed for enterprise agility. It consolidates Project Portfolio Management, Goals Management through OKRs, and Work Management into one platform. The API (V2) provides programmatic access to nearly all features available in the UI, including managing workspaces, boards, cards, workflows, and users.

## Authentication

Kanbanize uses **API key** authentication.

- To generate an API key, go to your account, click on the user dropdown menu at the top right corner of your Kanbanize account and select "API".
- The API key is passed as a custom HTTP header named `apikey` in every request.
- The base URL is tenant-specific, following the format: `https://{subdomain}.kanbanize.com/api/v2/`
- Each user must provide their **subdomain** (the unique account identifier) and their **API key**.

Example request:

```
GET https://{subdomain}.kanbanize.com/api/v2/users
Headers:
  apikey: {your_api_key}
```

For users with enabled Two-Factor Authentication (2FA), API V1 calls required an OTP header, but this applied to the now-deprecated V1 API.

The OpenAPI V2 specification in JSON format can be accessed at: `https://{subdomain}.kanbanize.com/openapi/json`.

## Features

### Workspace Management

Workspaces serve as organizational containers — the Account Owner creates the initial account infrastructure including Workspaces, Boards, custom roles, and invites users. You can list, create, and manage workspaces that group related boards.

### Board Management

Boards support an unlimited number of columns, sub-columns, and horizontal swimlanes, with features like WIP limits per column or board cell, default templates and assignees per board. Through the API you can create, read, update, archive, and delete boards, as well as retrieve and modify their structure (workflows, columns, lanes).

### Card and Task Management

You can create, update, and move cards, manage board configurations, and integrate real-time updates with other tools. Cards support properties such as title, description, assignee, priority, deadline, size, type, color, tags, stickers, custom fields, and external links. Cards can be moved between columns, lanes, and boards. You can also archive, discard, and restore cards.

### Subtask Management

You can break down complex work items into subtasks to monitor the progress of smaller activities, assign them to users, and convert them into separate kanban cards if necessary.

### Card Relationships and Links

You can visualize and track cross-team dependencies via different card links, establishing predecessor-successor and parent-child relationships between work items.

### Initiatives and Workflows

Boards consist of two workflows by default: the Initiatives Workflow (for projects/epics) and the Cards Workflow. The Initiatives Workflow is designed for senior team members and project managers, where larger projects are visualized through automated Initiatives.

### Custom Fields

Custom fields are created and managed at a global account level, accessible through the Administration menu. The API allows managing custom field definitions and their values on cards. Supported types include text, numeric, dropdown, and others.

### Comments and Attachments

You can add, update, and delete comments on cards. Files can be attached to kanban cards and previewed or downloaded directly from the card itself.

### User Management

Users are granted roles (default or custom), which control permissions for creating, moving, blocking, and updating cards, searching and filtering data, and configuring notifications.

### OKRs and Outcomes

The platform supports the OKR goal-setting framework through "measurable outcomes," using initiatives to visualize high-level goals/objectives and define their constituting key results.

### Business Rules (Automation)

Users can create flexible if-this-then-that policies that assign triggers to automatically catalyze other events in the system and send notifications. Business Rules can also invoke external web services with detailed filtering conditions.

## Events

Kanbanize supports **webhooks** that are configured per individual board.

Board Webhooks have to be configured per individual board. The secret key for the webhooks is passed as the `x-kanbanize-secret` header value in the POST request. Each webhook receives a minimal payload containing key identifiers (company, event type, board_id, card_id, user_id, etc.) to trigger further processing.

### Card Events

Supported events include: "Card created", "Card details changed", "Card deleted", "Card moved", and "Card archived". Payloads include `board_id`, `card_id`, and `user_id`.

### Subtask Events

Supported events include: "Subtask created", "Subtask updated", and "Subtask deleted". Payloads include `board_id`, `card_id`, `user_id`, and `subtask_id`.

### Comment Events

Supported events include: "Comment created", "Comment updated", and "Comment deleted". Payloads include `board_id`, `card_id`, `user_id`, and `comment_id`.

### Board Events

Supported events include: "Board renamed", "Board archived", "Board unarchived", "Board deleted", and "Board structure changed". Payloads include `board_id` and `user_id`.

Additionally, Kanbanize offers a more in-depth mechanism using Business Rules to invoke an external web-service, where you can build detailed filter/scenario conditions for when the webhook should be triggered — for example, when a card moves to a specific column and matches certain criteria.
