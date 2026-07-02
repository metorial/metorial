# Slates Specification for PhantomBuster

## Overview

PhantomBuster is a cloud-based automation platform for data extraction, lead generation, and social media automation across platforms like LinkedIn, Instagram, Facebook, Twitter, and others. It helps users collect lead information and automate various actions across multiple platforms using pre-built automation scripts called "Phantoms" and multi-step sequences called "Workflows." Storage endpoints support working with a LinkedIn Leads database for managing leads, lists, and syncing data with external tools.

## Authentication

PhantomBuster uses API key authentication. Put your API key in the `X-Phantombuster-Key-1` HTTP header (or in the `key` query string parameter) of every request you make. Using the query string parameter is not recommended as the key may appear in logs.

**Obtaining an API Key:**
Navigate to your workspace settings, then under the Technical section, select API keys. Click "Add API key" and copy the API key.

**Base URL:** `https://api.phantombuster.com/api/v2/` (v2 is the current version; v1 is also available at `https://phantombuster.com/api/v1/`).

**Example request:**

```
GET /api/v2/agents/fetch?id=YOUR_PHANTOM_ID
Host: api.phantombuster.com
X-Phantombuster-Key-1: YOUR_API_KEY
```

Treat your API key like a password. Anyone with access to it can run Phantoms in your Workspace.

## Features

### Phantom (Agent) Management

Create, fetch, update, and delete Phantoms (automation agents) in your workspace. Phantoms can be created, launched, updated, or fetched via the API. You can retrieve details about a Phantom's configuration, script, proxy settings, and execution history.

- Each Phantom is identified by an Agent ID found in the Phantom's URL.
- Combined Phantoms (multi-step automations, formerly called Flows) cannot be launched using the API.

### Launching and Aborting Phantoms

Programmatically launch Phantoms with custom arguments or abort running executions. Automations run immediately using the parameters you provide.

- Requires the Phantom ID and JSON arguments matching the Phantom's configuration.
- The Phantom you want to run must already be set up in your PhantomBuster Workspace before triggering it via API.

### Execution Monitoring (Containers)

Retrieve logs, execution details, and result information for a specific run. Each launch generates a Container ID that can be used to track the execution.

- A Container ID identifies a single launch of a Phantom.
- Access console output, status, progress, and exit messages for any container.

### Result Data Retrieval

Access Phantom results in CSV or JSON format directly via the API. Results are stored in cloud storage and can be downloaded using folder paths returned by the agent fetch endpoint.

- Result files created by Phantoms can't be removed through API calls and must be managed from the Dashboard.

### Leads Database (Storage)

Storage endpoints are mainly used when working with the LinkedIn Leads database, for example to delete leads, manage lists, or sync data with external tools.

- Fetch leads by list ID.
- Delete leads from the database.
- Manage lead lists programmatically.

### Script Management

Manage custom automation scripts that power Phantoms. Scripts can be created, updated, and fetched via the API.

- Scripts are written in JavaScript/Node.js and run in PhantomBuster's cloud environment.
- Scripts have a file size limit of 600KB for uploads.

### Agent and Global Objects

Agent and global objects are small JSON documents stored alongside your agents and PhantomBuster account. They are extremely useful for keeping state between different launches of your bots.

- Each Phantom can have its own JSON document (agent object) for persisting state.
- A single global object is shared across all agents in the workspace.

## Events

PhantomBuster supports webhooks that fire at the end of a Phantom's execution.

### Phantom Execution Completed

Custom webhooks are called at the end of an agent's execution, they will POST a payload containing some useful information about your Phantom's status and result to its associated Webhook URL.

- The webhook payload includes: agent ID, agent name, container ID, script name, launch duration, run duration, result object, exit message, and exit code.
- You can input your webhook URL in the webhook field and optionally set a secret sent with the request for security. The secret must be passed as a query parameter since custom request headers are not supported.
- The maximum timeout for a webhook is 11 seconds. If the request exceeds this time limit, it is cancelled and considered a server error.
- Webhooks are configured per Phantom via the setup page under Advanced Notification Settings.
