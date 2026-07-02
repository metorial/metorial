Let me get more details about the Nutshell API data models and webhook specifics.Now I have enough information to write the specification.

# Slates Specification for Nutshell

## Overview

Nutshell is a cloud-based CRM platform designed for small and medium-sized businesses. It provides contact management, lead tracking, sales pipeline management, activity logging, and email marketing capabilities. The API allows programmatic access to manage CRM data including contacts, leads, accounts, activities, and more.

## Authentication

Nutshell uses **HTTP Basic Authentication** for its API.

- **Username**: Your company domain or a specific user's email address.
- **Password**: An API key generated from your Nutshell account.

**Generating an API Key:**

1. Log in to your Nutshell account.
2. Click on your Avatar icon in the lower-left corner.
3. Click on "Company settings."
4. Under the Connections heading, click on "API keys."
5. Click "(+) Add API key..." and choose the appropriate permission type.

**API Key Permission Types:**

- **API + user impersonation**: Full API access, required for integrations like Zapier that act on behalf of users.
- **Web-only**: Limited access for creating basic HTML form submissions only (can add contacts, accounts, or leads but cannot retrieve, edit, or delete data).

**Endpoint Discovery:**
Nutshell uses an endpoint discovery mechanism. The primary JSON-RPC API endpoint is constructed as: `https://app.nutshell.com/api/v1/json`. The endpoint URL returned by endpoint discovery should be cached for 10–90 minutes.

**REST API:**
Nutshell also offers a newer REST API (available on the Enterprise plan) that uses the same HTTP Basic authentication with API key. The legacy JSON-RPC API remains supported and is the most full-featured option.

## Features

### Contact (People) Management

Create, retrieve, update, and search for contacts (people). Contacts can be associated with leads and accounts. Supports custom fields and tagging.

### Account (Company) Management

Create, retrieve, update, and search for company accounts. Accounts can be linked to contacts, leads, and industries.

### Lead Management

Create, retrieve, update, and search for leads (sales opportunities). Leads can be moved between stages and pipelines, assigned to users or teams, and marked with outcomes (won, lost). Leads support associations with contacts, accounts, products, competitors, and sources. You can specify product quantities and pricing on leads.

### Activity Logging

Create, retrieve, and edit activities. Activities can be associated with leads and participants, enabling tracking of interactions such as calls, meetings, and emails.

### Task Management

Create and manage tasks to track follow-ups and action items within the CRM.

### Notes and Files

Add notes to various entities (leads, contacts, accounts). Upload and download files associated with entities.

### Products and Competitors

Retrieve and manage product information and competitor data. Both can be associated with leads to track what's being sold and who the competition is.

### Pipeline and Stage Management

Retrieve information about stagesets (pipelines) and milestones (stages). Move leads between stages and pipelines to reflect progress in the sales process.

### Users and Teams

Retrieve user and team information. Assign leads to specific users or teams for ownership and collaboration.

### Tags, Sources, Markets, and Industries

Manage metadata entities such as tags, lead sources, markets, and industries that can be associated with leads or accounts for organization and reporting.

### Custom Fields

Retrieve custom field definitions and add custom field data to entities, enabling flexible data modeling beyond the standard fields.

### Timeline Access

Access and filter entity timelines to review the history of interactions and changes on records.

## Events

Nutshell supports **webhooks** that send HTTP POST notifications to a specified URL when certain events occur.

### Entity Change Events

You can subscribe to webhooks for changes (creation, updates) to the following entity types:

- **Leads** — Triggered when leads are created or modified (e.g., stage changes, outcome updates).
- **Contacts** — Triggered when contact records are created or updated.
- **Accounts** — Triggered when company account records are created or updated.
- **Activities** — Triggered when activities are logged or modified.
- **Products** — Triggered when product records change.
- **Competitors** — Triggered when competitor records change.

Webhook payloads include the event type (e.g., create, update), the affected entity, details of changes made, timestamps, the user who performed the action, and related entities. Webhooks are configured within the Nutshell account settings by specifying the events to subscribe to and the destination URL.
