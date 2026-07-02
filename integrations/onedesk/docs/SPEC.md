Let me check the actual API documentation for OneDesk and look for webhook support.Now let me look at the two APIs OneDesk has - the older v2.0 token-based one and the newer public API with API keys.Based on my research, I now have enough information to write the specification. OneDesk has two API versions: the older v2.0 (token-based auth) and the newer Public REST API (API key-based). OneDesk does not appear to natively support webhooks; the Zapier/Pipedream triggers are polling-based.

# Slates Specification for Onedesk

## Overview

OneDesk is a combined help desk and project management platform. Its functionality includes accessing organizations and their information, working with feedback, requirements, tasks, issues, projects, worklogs, and more. The newer API also supports invoicing and quoting features, allowing creation and management of quotes and invoices.

## Authentication

OneDesk supports two authentication methods:

### 1. API Key Authentication (Public REST API — Recommended)

The newer Public REST API uses API key authentication. The API key is used to authorize API calls. To create an API key you need to be the account owner, then go to Admin > Integrations > API to generate one. You can create as many keys as you'd like but each requires a user license.

The API key must be added as a header parameter titled `OD-Public-API-Key`.

- **Base URL:** `https://app.onedesk.com/rest/public/`
- **Header:** `OD-Public-API-Key: <your_api_key>`

The Public REST API is available on the Enterprise Plan.

### 2. Token-Based Authentication (Legacy REST API v2.0)

The older API uses email/password login to obtain an authentication token. You send a POST request to `https://app.onedesk.com/rest/2.0/login/loginUser` with your email and password. The response returns an `authenticationToken` which is then passed in subsequent request bodies.

- **Base URL:** `https://app.onedesk.com/rest/2.0/`
- The `authenticationToken` is included in the JSON body of each API request, not as a header.

## Features

### Work Item Management (Tickets & Tasks)

Create, read, update, and search for work items including tickets, tasks, and other configurable item types. Items can be looked up by internal ID or external ID. The API is organized based on different work objects such as timesheets, tickets, etc. Items support custom fields, status lifecycle management, priorities, and assignments.

### Project & Space Management

Create and manage projects (called "spaces" in the older API) and portfolios. Projects can be organized hierarchically with parent containers. Search supports filtering by properties using operations like EQ, NOT_EMPTY, and filtering on both standard and custom fields.

### Organization & Customer Management

Retrieve organization profile and policy information. Create and manage users and customers. The API allows creating users or customers programmatically.

### Timesheets & Work Logging

Create and manage timesheets to track time spent on tasks and tickets. Timesheets can be pushed to external accounting tools.

### Invoicing & Quoting

The API supports invoicing and quoting features, allowing creation and update of quotes and invoices via the API.

### Messaging & Conversations

Create messages or comments on work items. This includes both internal comments and public-facing customer communications.

### Search & Filtering

Search across work items, projects, and other entities using filter-based queries. Filters support property-based conditions including comparisons on standard fields and custom fields.

## Events

The provider does not support webhooks or a native event subscription mechanism through its API. Third-party platforms like Zapier and Pipedream offer polling-based triggers for OneDesk (e.g., new item created, item updated, project created), but these are not built-in webhook or push event features of the OneDesk API itself.
