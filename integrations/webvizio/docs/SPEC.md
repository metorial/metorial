# Slates Specification for Webvizio

## Overview

Webvizio is a visual bug tracking and website feedback tool designed for web agencies, product managers, QA teams, and developers. It is an all-in-one tool for website feedback, bug tracking, collaboration, and productivity that simplifies reviewing web designs, reporting bugs, managing tasks, and communicating with clients and teams on live websites and web applications. It also supports annotation of images, PDFs, and Figma designs, and integrates with AI coding tools via an MCP server.

## Authentication

Webvizio uses two authentication mechanisms depending on the use case:

### Personal Access Token (for Webhooks and REST API)

To use webhooks, all requests sent to Webvizio must include a personal access token. The token should be included in the Authorization header as a Bearer token.

Format: `Authorization: Bearer <token>`

To obtain a token, go to the **Webhooks tab** in your Webvizio account settings and click the "Create token" button. Webvizio stores tokens in encrypted form — you can only copy the token immediately after generating it. Generating a new token invalidates the previous one.

### API Key (for MCP Server / programmatic access)

Generate and copy the API key for the MCP server on the AI Settings page at `https://app.webvizio.com/profile/ai`. The API key is provided as an environment variable (`WEBVIZIO_API_KEY`) when configuring the MCP server or making API calls.

There is no OAuth2 flow. Both methods are static credentials tied to the user's account.

## Features

### Project Management

You can create URL-based projects, find projects, and update projects in Webvizio via the API. Projects can also be deleted. Each project can have an External ID to synchronize with external systems.

### Task Management

Tasks represent feedback items, bug reports, or development items within a project. Through the API you can create, find, update, and delete tasks. Each task can include precise visual annotations pinned directly to live UI elements, along with automatically attached technical data including screenshots, console logs, network requests, and reproduction steps.

- Tasks support attributes such as priority levels, due dates, status, and assignees.
- Tasks include technical metadata: console logs, network logs, environment details, DOM snapshots, annotated screenshots, and user action recordings.

### Comment Management

Comments can be created, found, and deleted on tasks. Comments represent threaded discussions or feedback on individual tasks.

### AI Prompt Generation

The MCP server lets AI coding assistants communicate directly with the Webvizio API. Through it, you can retrieve task descriptions, AI-ready prompts, error logs, console logs, network logs, action logs (reproduction steps), and screenshots for tasks. Tasks can also be marked as done programmatically.

- Available MCP tools include: fetching projects, getting/setting the current project, listing open tasks, retrieving task details (description, prompt, various logs, screenshots), and closing tasks.

### External ID Synchronization

Each project, task, and comment supports an External ID field that can be set at creation time. This enables bidirectional sync between Webvizio and external systems using your own identifiers for search, update, and delete operations.

## Events

Webvizio supports both outgoing webhooks (event notifications) and the REST Hooks pattern for programmatic webhook subscription management.

### Project Events

Outgoing webhooks fire when a new project is created, when a project name or screenshot is updated, or when a project is deleted.

### Task Events

Webhooks trigger when a new task is created, when a task is updated, or when a task is deleted.

### Comment Events

A webhook triggers when a new comment is created. A delete comment event is also available.

### Configuration

- Outgoing webhooks are configured in the Webhooks tab of account settings by selecting an event and providing a target URL.
- Events are only fired when the action is initiated by a user within the Webvizio interface, not when triggered by another webhook or integration.
- Users with Advanced and Enterprise subscription plans can add multiple webhooks for a single event.
- For Advanced and Enterprise subscription plan users, the REST Hooks technology is available, which allows adding and removing outgoing webhooks through the Webvizio API without relying on the web interface. For Starter plan users, REST Hooks are not available, but outgoing and incoming webhooks can still be used.
- To subscribe to an event via REST Hooks, send a POST request to `https://app.webvizio.com/api/v1/webhook`. To unsubscribe, send a DELETE request to `https://app.webvizio.com/api/v1/webhook/{id}` where `{id}` is the webhook identifier obtained when subscribing.
