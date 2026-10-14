# Dart API Specification

## Overview

Dart (dartai.com) is an AI-native project management platform that allows teams to manage tasks, documents, projects (called "dartboards"), and collaborate with AI-powered automation. It is an intelligent project management tool that automates and enhances many standard PM functions. It connects with platforms like GitHub, Slack, Discord, ChatGPT, and Zapier.

## Authentication

Dart supports two authentication methods:

### Bearer Token (API Key)

The primary method for API access. The API is usually accessed through a bearer token that you get from the UI, but OAuth is available too for MCP or if you're building your own app/integration.

To obtain a token:

1. Navigate to your Dart profile at `https://app.dartai.com/?settings=account` (Settings > Account).
2. Copy the authentication token displayed there.
3. Save that as the `DART_TOKEN` environment variable, or include it as a `Bearer` token in the `Authorization` header of API requests.

Tokens are prefixed with `dsa_` (e.g., `dsa_...`).

### OAuth 2.0

OAuth is available for building custom apps/integrations and is used by the MCP (Model Context Protocol) integration. For MCP integrations like ChatGPT, the Authentication is set to OAuth with the MCP URL `https://mcp.dartai.com/mcp`. Dart supports OAuth 2.0 for secure access.

The API base URL is `https://app.dartai.com/api/v0/public/`, and interactive API documentation is available at `https://app.dartai.com/api/v0/public/docs/`.

## Features

### Task Management

Create, read, update, and delete tasks. Tasks can be filtered by assignee, status, dartboard, priority, due date, and more. Tasks support properties including title, description, status, priority (P0–P3), size, start and due dates, tags, assignees, parent tasks, and custom properties. Comments on tasks can be added via the API, and task relationships like blockers, subtasks, and duplications can be viewed, updated, and removed.

### Document Management

The API supports task and doc management. Documents can be used for wikis, meeting notes, project descriptions, and creative writing. Documents can be created, retrieved, and managed programmatically.

### Workspace Configuration

Get information about the user's space, including available assignees, dartboards, folders, statuses, tags, priorities, and sizes. This allows integrations to discover the structure and settings of a Dart workspace before performing operations.

### Time Tracking

Add time tracking entries to tasks with start and end timestamps including a timezone. Entries can be attributed to a user and can target a time tracking custom property. The updated task includes the refreshed total tracked time.

### Connected Account

Check the current account with `GET /me`, which returns authentication status and the authenticated user ID, name, and email.

## API Sources

- [Public API documentation](https://app.dartai.com/api/v0/public/docs/)
- [Current OpenAPI schema](https://app.dartai.com/api/v0/public/schema/)
- [OAuth integration guide](https://help.dartai.com/en/articles/12618292-dart-oauth-integration-guide)

## Events

Dart supports webhooks for event-driven integrations. Webhooks and API access are available on certain plan tiers, and custom triggers can be configured and connected directly to tools like n8n or webhooks.

### Task Events

Webhooks can notify external systems when tasks are created, updated, or completed. Due date updates, time tracking, and other property changes are included in webhook payloads. Webhook configuration is managed through the Dart UI settings. Webhooks and Zapier use the same user-facing types, ensuring consistent data formats across integration methods.
