Now I have enough information to write the specification. Let me also check Fireberry's webhook support more carefully — the search results showed outbound webhooks (Fireberry sending data out via automation), but I need to check if there are inbound webhook subscriptions or event notification APIs.

Based on my research, Fireberry's webhook support is outbound only (as part of automations — sending data to external URLs when triggers fire within the system). There doesn't appear to be an API-based webhook subscription mechanism for receiving events programmatically.

# Slates Specification for Fireberry

## Overview

Fireberry is a customizable, all-in-one CRM platform that unifies Sales, Marketing, and Service capabilities. It provides tools for managing contacts, accounts, opportunities, invoices, tickets, projects, and marketing campaigns, with support for custom objects and fields to adapt to any business workflow.

## Authentication

Fireberry uses **API Access Tokens** (referred to as `TokenID`) for authentication. Each system user has their own personal access token.

**How to obtain a token:**

1. Log into your Fireberry account.
2. Click the Profile Picture in the top right corner.
3. Select **Profile**.
4. Click the **Account Security** tab.
5. Click the **API Access Token** tab.
6. Copy the displayed token.

**How to use the token:**

Include the token in the request header with the key `tokenid`:

```
tokenid: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

The base URL for all API requests is `https://api.fireberry.com/api/`.

The token determines the user context: all data access and actions are scoped to the permissions and access level of the user whose token is used. There are no OAuth flows or scopes — only token-based authentication.

## Features

### Account & Contact Management

Create, read, update, and delete account and contact records. Accounts represent organizations or individuals, while contacts represent people associated with those accounts. Supports custom fields and related record lookups.

### Sales Pipeline (Opportunities & Orders)

Manage opportunities through the sales lifecycle. Create and track orders and order items tied to accounts. Supports line-item management on orders.

### Invoicing & Financial Documents

Manage multiple invoice types: standard invoices, credit invoices, delivery invoices, draft invoices, invoice receipts, and receipts. Each supports line items. Transactions and transaction items are available as read-only records.

### Service & Ticketing

Create and manage support tickets linked to customer records. Tickets can be assigned, prioritized, and tracked through resolution.

### Activities & Scheduling

Manage activities including tasks, meetings, phone calls, notes, and activity logs. These can be associated with other records such as accounts, contacts, or opportunities.

### Marketing Campaigns

Create and manage campaign records to track marketing initiatives and their association with contacts and accounts.

### Products & Articles

Manage a product catalog with product records. Create and manage articles for knowledge base or content purposes.

### Projects & Contracts

Track projects and contracts, associating them with relevant accounts and contacts.

### Assets & Competitors

Manage asset records (e.g., equipment or items associated with customers) and competitor records for competitive tracking.

### Business Units & Users

Manage organizational business units. Read and update user records within the system.

### Custom Objects & Fields

Create custom objects to model data beyond the built-in types. Add custom fields of various types (text, number, email, URL, phone, date, date-time, text area, HTML, lookup, summary, formula, picklist) to any standard or custom object. This allows extending the data model to fit specific business needs.

### Querying & Search

Use a powerful query language to search for records across any object type. Supports filtering with operators (equals, not equals, greater/less than, starts-with, is-null, etc.), logical operators (AND, OR), and nested conditions. Query results can specify which fields to return and the sort order.

### Metadata

Retrieve schema information including all available objects, an object's fields, field details, and picklist field values. Useful for building dynamic integrations.

### File Upload

Upload files and associate them with records in the system.

## Events

Fireberry supports **outbound webhooks** as part of its built-in automation engine. These are configured within the Fireberry UI (not via API) as automation actions that fire when specified triggers occur in the system.

### Automation-Based Outbound Webhooks

- Webhooks are configured as actions within Fireberry's automation workflows. When a trigger condition is met (e.g., a record is created or updated), Fireberry sends an HTTP request to a specified external URL.
- The webhook request can include custom headers (e.g., Content-Type, authorization tokens) and a custom body (typically JSON) with field references from the triggering record.
- Webhooks are disabled automatically if they receive too many consecutive error responses from the target URL.

Fireberry does not expose an API endpoint for programmatically subscribing to or managing webhook registrations. Webhook setup is done through the Fireberry automation UI.
