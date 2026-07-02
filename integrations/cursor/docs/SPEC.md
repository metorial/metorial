The pages didn't render useful content. Let me try fetching the docs directly.Now I have enough information to write a comprehensive specification.

# Slates Specification for Cursor

## Overview

Cursor is an AI-powered code editor built on VS Code that provides intelligent code completion, AI agents, and automated coding workflows. It offers two distinct APIs: a Cloud Agents API for programmatically managing AI coding agents that operate on GitHub repositories, and an Admin API for team management, usage tracking, and spend monitoring.

## Authentication

Cursor uses **API Key with Basic Authentication** for both its APIs. There are two types of API keys serving different purposes:

### User API Keys (Cloud Agents API)

Generate an API key in your Cursor dashboard under **Integrations > User API Keys**.

- Base URL: `https://api.cursor.com`
- Authentication is Basic Auth — base64 encode your API key with a trailing colon.
- Format: `Authorization: Basic base64(YOUR_API_KEY:)`
- The API key is tied to your organization and provides access to all repositories and agents associated with your Cursor account.
- Key format: `key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Admin API Keys (Team Management)

All API requests require authentication using an API key. Only team administrators can create and manage API keys. API keys are tied to the organization, viewable by all admins, and are unaffected by the original creator's account status.

- Navigate to cursor.com/dashboard → Settings tab → Cursor Admin API Keys to generate a key.
- Uses the same Basic Authentication mechanism (API key as username, empty password).

## Features

### Cloud Agent Management

Cloud Agents API manages cloud agents that operate on GitHub repositories. You can programmatically launch AI coding agents, assign them tasks via natural language prompts, point them at specific GitHub repositories and branches, and have them create pull requests with their changes.

- A new cloud agent requires a prompt (text; optionally with images) and a source repository. You can optionally specify a model, target branch configuration (auto-create PR, branch name), and a webhook for notifications.
- Prompts can include up to 5 images with base64 data and dimensions.
- Default model selection can be automatic if no model is specified on creation.
- Agents go through statuses: CREATING, RUNNING, FINISHED, ERROR.

### Agent Lifecycle & Interaction

You can monitor agent status, retrieve conversation histories, send follow-up instructions to running agents, stop agents, and delete them.

- Follow-ups are useful for iterating on agent work, requesting modifications, or providing clarifications.
- Conversation history cannot be retrieved for deleted agents.

### Repository & Model Discovery

You can list GitHub repositories accessible to your Cursor account and query available AI models that can be used when launching agents.

### API Key Info

Retrieve information about the authenticated API key, including the associated user email and key metadata.

### Team Member Management (Admin API)

Retrieve all team members and their details, including name, email, and role (owner or member).

### Usage & Spend Tracking (Admin API)

Retrieve detailed daily usage metrics for your team within a date range. Provides insights into code edits, AI assistance usage, and acceptance rates.

- Retrieve detailed usage events for your team with comprehensive filtering, search, and pagination options. This endpoint provides granular insights into individual API calls, model usage, token consumption, and costs.
- Retrieve per-member spend data for the current billing cycle, including spend in cents, request counts, and hard limit overrides.

### Repository Blocklists (Admin API)

Add repositories and use patterns to prevent files or directories from being indexed or used as context for your team. Retrieve all repository blocklists configured for your team.

### Automations

Cursor Automations allow building always-on agents. These agents run on schedules or are triggered by events like a sent Slack message, a newly created Linear issue, a merged GitHub PR, or a PagerDuty incident. In addition to these built-in integrations, you can configure your own custom events with webhooks.

- Once triggered, the agent spins up in an isolated cloud sandbox. It follows your instructions using the MCPs and models you have configured, executes the task, and verifies its own output before completing.
- A built-in memory tool allows the agent to learn from previous runs and improve with repetition over time.
- Automations are configured via the Cursor dashboard at cursor.com/automations, not via the REST API.

## Events

### Cloud Agent Webhooks

When you create an agent with a webhook URL, Cursor will send HTTP POST requests to notify you about status changes. Currently, only `statusChange` events are supported, specifically when an agent encounters an ERROR or FINISHED state.

- Webhook URL and an optional secret (minimum 32 characters) are provided when launching an agent.
- Payloads are signed using HMAC SHA-256. Headers include `X-Webhook-Signature`, `X-Webhook-Id`, and `X-Webhook-Event`.
- The payload includes agent ID, status, source repository, target branch/PR URL, and a summary of the work done.

### Automation Triggers (Inbound)

Cursor Automations support inbound event triggers that launch agents automatically:

- **GitHub PR**: Triggered on a merged or updated GitHub PR.
- **Slack Message**: Triggered when a message is sent in a configured Slack channel.
- **Linear Issue**: Triggered when a new Linear issue is created.
- **PagerDuty Incident**: Triggered on a PagerDuty incident.
- **Cron Schedule**: Run agents on a timer.
- **Custom Webhooks**: Custom webhooks allow you to connect any internal system or external service as a trigger source.

Note: Automation triggers are configured through the Cursor dashboard UI, not through the REST API.
