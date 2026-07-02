Let me fetch the entity types page to get a complete list of available entities/features.Now I have a comprehensive understanding of ForceManager's API. Let me compile the specification.

# Slates Specification for Forcemanager

## Overview

ForceManager (now branded as Sage Sales Management) is a mobile-first CRM platform designed for field sales teams. It provides tools for managing accounts, contacts, opportunities, activities, sales orders, products, and calendars, along with sales performance tracking and reporting.

## Authentication

ForceManager supports two authentication methods:

### 1. API Key Authentication (HMAC Signature)

Authentication is performed using an API Public Key and a computed message signature. Each request requires three custom HTTP headers:

- **`X-FM-PublicKey`**: Your API Public Key, sent in plain text.
- **`X-FM-UnixTimestamp`**: A Unix timestamp for the current time in UTC+1.
- **`X-FM-Signature`**: A SHA1 hash computed by concatenating the Unix Timestamp, the Public Key, and the Private Key: `sha1(UnixTimestamp + APIPublicKey + APIPrivateKey)`.

You will need both a **Public API key** and a **Private API key**. Admins can find API keys under **Settings > Integrations > API key** in the Sage Sales Management web app, or in the **Password** section of the ForceAdmin tool.

You should also include the **`X-FM-API-Version`** header to specify which API version to use (e.g., `X-FM-API-Version: 4`).

Base URL: `https://api.forcemanager.com/api/v4/`

### 2. OAuth 2.0 / Session Key Authentication

ForceManager also supports OAuth authentication. After completing the OAuth flow, the resulting access token is passed as an `X-Session-Key` header on API requests. This is the method used by third-party integration platforms.

## Features

### Account (Company) Management

Create, read, update, and delete company/account records. Accounts include fields for name, address, geolocation, contact details, VAT number, account type, status, segment, branch assignment, and multiple sales representative assignments. Entities support custom extra fields (prefixed with `z_`) that are maintained by the customer.

### Contact Management

Manage contacts associated with accounts. Contacts include personal details, multiple email addresses, phone numbers, social profiles (LinkedIn, Skype), and can be linked to accounts and assigned to sales reps.

### Activity Tracking

Record and manage sales activities such as visits, calls, and meetings. Activities can have related documents attached to them. Activities support check-in/check-out with geolocation data and can be linked to accounts, contacts, and opportunities.

### Opportunity Management

Track sales opportunities through their lifecycle. Opportunities include amount, probability, expected and actual closing dates, won/lost dates, status tracking, and geographic information. Opportunities can be associated with multiple accounts (useful for construction industry workflows) and linked to a branch and currency.

### Product Catalog

Manage a product catalog with model names, descriptions, pricing, cost, category and family classification, maximum discount percentages, and availability status.

### Sales Orders

Create and manage sales orders and their line items. Sales orders can be linked to accounts, contacts, opportunities, and branches. Order lines reference products with quantity, pricing, and up to four levels of discounts. Sales orders support rate-based pricing and expected/actual closing dates.

### Calendar & Task Management

Manage calendar events and tasks. Calendar entries support start/end dates, all-day events, notification settings, and can be linked to accounts, contacts, and opportunities. Entries can be marked as tasks or events and tracked for completion.

### User Management

Read-only access to user records including their details, branch assignments, permission levels, user types, and last known geolocation data.

### Views & Filters

Create and manage saved view filters that can be applied to entities. Views can be public or restricted to specific users, and can have active date ranges.

### List of Values

Manage dynamic lookup lists used across entities (e.g., account types, account statuses, activity types, opportunity statuses, contact types, branches, segments, countries, currencies).

### Search & Querying

Search records by important fields (entity-specific searchable fields) that are joined with AND operators in a LIKE fashion. An advanced search/query language is also available for more complex filtering.

### External ID Mapping

Look up ForceManager internal IDs using external system IDs, enabling synchronization with external ERPs, CRMs, or accounting systems.

## Events

The provider does not natively support webhooks or event subscription mechanisms through its API. There is no documented webhook or callback registration endpoint in the ForceManager API. Third-party integration platforms that offer ForceManager "triggers" implement these via polling mechanisms rather than native push-based events from ForceManager.
