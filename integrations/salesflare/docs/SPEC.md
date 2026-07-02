The docs page seems to be a JavaScript-rendered page. Let me try searching for more details about the API features and webhooks.Let me get the Swagger/OpenAPI spec to understand the full API:Let me try fetching the Salesflare API docs JSON directly:Now I have enough information to compile the specification. Let me also look at the Knit developer page for more API details:Now I have comprehensive information to write the specification.

# Slates Specification for Salesflare

## Overview

Salesflare is a CRM platform designed for small and medium-sized businesses selling B2B. It automates data entry by gathering information from emails, calendars, and social profiles, and provides features for managing contacts, accounts, sales pipelines, and email workflows. The API is a REST API available at `https://api.salesflare.com`.

## Authentication

Salesflare uses bearer token authentication via API keys. You need to include the header `Authorization: Bearer APIKEY` with every request.

To obtain an API key:

1. Navigate to **Settings > API keys** in your Salesflare account and click the orange "+" button to create a new API key.

There is no OAuth2 flow. Salesflare uses API key-based authentication to secure its API. Each API key is tied to a user account and inherits that user's permissions.

**Example header:**

```
Authorization: Bearer your_api_key_here
```

**Base URL:** `https://api.salesflare.com`

## Features

### Account Management

Accounts represent companies or groups of contacts you sell to, and opportunities are sales opportunities with those accounts. You can create, read, update, and delete accounts, including details such as domain, website, description, addresses, email addresses, phone numbers, social profiles, tags, and custom fields. You can also manage which users and contacts are associated with an account.

### Contact Management

Contacts are the people who work in accounts. The API allows full CRUD operations on contacts with attributes such as name, email, phone numbers, addresses, roles, social profiles, tags, and custom fields. Contacts can be filtered by various criteria including modification date, making incremental syncing possible for contacts.

- The contacts list method supports a `modification_after` query parameter, enabling incremental data loading.
- However, the list methods for accounts and other objects don't support such parameters.

### Opportunity & Pipeline Management

The API allows retrieving and managing sales opportunities with filtering by stage, owner, account, value range, close date, creation date, and more. Opportunities include fields for value, currency, close date, probability, lost reason, lead source, recurring revenue, and custom fields. You can also list and manage pipelines and their stages.

### Task Management

Tasks can be created, updated, listed, and deleted. Tasks support assignees, reminder dates, descriptions, and can be linked to accounts. Different task types are supported (e.g., manual tasks, suggested tasks).

### Internal Notes & Messages

You can create, update, and delete internal notes on account timelines. Notes support mentions of team members and are linked to specific accounts.

### Meeting & Call Logging

The API supports creating, updating, and deleting meetings and calls. Meetings include date, participants, subject, description, and notes. Calls can be logged with similar fields.

### Tag Management

Tags can be assigned to accounts, contacts, and opportunities. The API allows creating, reading, updating, and deleting tags. You can also retrieve usage details for a tag across workflows, saved filters, and reports.

### Custom Fields

The API supports managing custom fields for accounts, contacts, and opportunities. You can create, update, delete, and list custom fields and their options. For opportunities, all custom fields are pipeline-specific.

### Email Workflow Management

The API allows listing, creating, updating, and managing email workflows. You can configure workflow filters, steps, scheduling, and manage workflow audience (re-enter or exit contacts from workflows). Merge fields for workflows can also be retrieved.

### User & Team Management

You can list users, retrieve user details, and manage user groups. The current authenticated user's details (including team, plan, and subscription info) can also be retrieved.

### Email Data Sources

You can list and update email data sources, including configuring email signatures and sending limits per day/hour.

### Reference Data

The API provides access to supported currencies, pipeline stages, filter fields for entities, and custom field types.

## Events

Salesflare does not have native endpoints for setting up real-time notifications or webhooks. The provider does not support events through a built-in webhook or event subscription mechanism in its own API.
