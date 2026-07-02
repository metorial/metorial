# Slates Specification for Sourcegraph

## Overview

Sourcegraph is a code intelligence platform that provides code search, code navigation, and AI-powered code understanding across repositories and code hosts. It deeply understands your code, no matter how large or where it's hosted, to power modern developer experiences. Two APIs are exposed, GraphQL and Stream, along with a newer versioned REST API and an MCP Server.

## Authentication

Sourcegraph supports the following authentication methods for API access:

### Access Tokens (Primary Method)

Access tokens permit authenticated access to the Sourcegraph API. This is required for the src command line interface to Sourcegraph to operate, and also allows other tools that integrate with Sourcegraph to issue requests on your behalf.

Generate an access token at `https://<your-instance>/user/settings/tokens`. Pass the token via the `Authorization` header:

```
Authorization: token YOUR_TOKEN
```

Site admins may create access tokens with the special `site-admin:sudo` scope, which allows the holder to perform any action as any other user. The sudo token is passed as:

```
Authorization: token-sudo user="USERNAME",token="YOUR_TOKEN"
```

### OAuth Tokens

OAuth access tokens are always short-lived and must be refreshed using refresh tokens before expiration. Pass OAuth tokens via:

```
Authorization: Bearer YOUR_OAUTH_TOKEN
```

### Service Accounts

For automated scripts, CI/CD pipelines, and production integrations, use service accounts instead of personal access tokens. Service accounts are designed specifically for programmatic API access and provide better security and audit capabilities.

### MCP-Specific: Dynamic Client Registration (OAuth 2.0)

Sourcegraph implements Dynamic Client Registration (RFC 7591), so compatible clients can authenticate automatically without pre-configured client IDs. DCR-registered applications are restricted to the `mcp` scope, which limits access to MCP endpoints only.

**Important:** All API calls require the Sourcegraph instance URL (e.g., `https://sourcegraph.example.com`). There is no single central API endpoint; it depends on your deployment.

## Features

### Code Search

Sourcegraph's core capability is searching across all repositories, branches, and code hosts. Features include Code Search (search through all repositories across all branches and all code hosts), Deep Search (ask natural language questions and get detailed answers from an AI agent), and Code Intelligence (navigate code, find references, see code owners, trace history).

- Supports literal, regex, and structural search patterns.
- Can search code content, file paths, diffs, commit messages, and symbols.
- Queries can be scoped by repository, language, file path, branch, and more.
- Exhaustive search returns the complete set of every result matching an expression. Sourcegraph's search is optimized for fast interactive searching, and there are time and match limits which can stop a search. To remove the limits, add `count:all` to your query.

### Deep Search (AI-Powered)

Sourcegraph is introducing a new, versioned API for custom integrations, starting with the general availability of the Deep Search API. The new Deep Search API can be used to bring Deep Search to your own tooling.

- Allows natural language questions about your codebase.
- Returns detailed, AI-generated answers with code citations.

### Streaming Search

With the Stream API you can consume search results and related metadata as a stream of events. The Sourcegraph UI calls the Stream API for all interactive searches. Compared to the GraphQL API, it offers shorter times to first results and supports running exhaustive searches returning a large volume of results without putting pressure on the backend.

- Uses Server-Sent Events (SSE) format.
- Suitable for large result sets and real-time consumption of results.

### Batch Changes

Batch Changes helps you ship large-scale code changes across many repositories and code hosts. You can create pull requests on all affected repositories, and it tracks their progress until they're all merged. You can also preview the changes and update them at any time.

- Define changes using a declarative YAML batch spec.
- A single batch change can span many repositories and many code hosts.
- Manage batch changes programmatically via the GraphQL API: create, execute, publish changesets, and track status.

### Code Insights

Manage Code Insights on private Sourcegraph instances with the API.

- Create and manage line chart search insights that track code patterns over time.
- Configure repository scope (specific repos or all repos) and time intervals.
- Organize insights into dashboards with configurable permissions (user, organization, or global).
- Some insights generate and persist time series data, while others calculate their data just-in-time on page load. Line chart insights will be persisted, while language statistics pie charts run over a single repository will be generated just-in-time.

### Code Monitoring

Code monitors allow you to keep track of and get notified about changes in your code. Some use cases include getting notifications for potential secrets, anti-patterns, or common typos committed to your codebase.

- Triggers are based on search queries run against new commits.
- Actions include sending emails, Slack messages, or calling webhooks.

### Repository Management

The GraphQL API allows querying and managing repositories connected to the Sourcegraph instance, including listing repositories, their metadata, branches, and commit history. You can also trigger repository refreshes on demand.

### User and Organization Management

Via the GraphQL API, administrators can manage users, organizations, and permissions. This includes creating users, managing access tokens, and configuring permissions syncing with code hosts.

### MCP Server

Sourcegraph provides an MCP Server for connecting AI agents and applications to Sourcegraph's code search capabilities.

- Exposes tools for natural language search, file reading, commit search, and repository listing.
- Compatible with AI tools and IDEs that support the Model Context Protocol (e.g., Claude Code, Amp, VS Code).

## Events

Outgoing webhooks can be configured on a Sourcegraph instance in order to send Sourcegraph events to external tools and services. This allows for deeper integrations between Sourcegraph and other applications.

Currently, webhooks are only implemented for events related to Batch Changes. They also cannot yet be scoped to specific entities, meaning that they will be triggered for all events of the specified type across Sourcegraph. Expanded support for more event types and scoped events is planned for the future.

### Batch Change Events

Events triggered when batch changes are modified:

- **`batch_change:apply`** — Triggered when a batch spec is applied to a batch change.
- **`batch_change:close`** — Triggered when a batch change is closed.
- **`batch_change:delete`** — Triggered when a batch change is deleted.

### Changeset Events

Events triggered when changesets (pull requests/merge requests) created by batch changes are updated:

- **`changeset:update`** — Triggered when a changeset is updated on the code host by Sourcegraph.
- **`changeset:update_error`** — Triggered when an attempt to update a changeset on the code host fails.

### Webhook Configuration

- A shared secret is configured between Sourcegraph and the external service. A default value is provided, but you are free to change it.
- Payloads are JSON and mirror the corresponding GraphQL API types.

### Code Monitor Webhook Notifications

Webhook notifications provide a way to execute custom responses to a code monitor notification. They are implemented as a POST request to a URL of your choice. The body of the request contains all the information available about the cause of the notification.

- Configured per code monitor as an action.
- Payload includes the monitor description, URL, and matched diff ranges.
