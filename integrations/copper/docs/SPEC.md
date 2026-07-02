# Slates Specification for Copper

## Overview

Copper is a CRM (Customer Relationship Management) platform built for Google Workspace users. It integrates directly with Google Workspace and is designed for teams in sales, marketing, and customer support to manage their relationships and interactions with customers. The Copper Developer API provides a RESTful interface with JSON-formatted responses to access most Copper resources.

## Authentication

Copper supports two authentication methods:

### API Keys

The Dev API uses token-based authentication. You have to include the token in the header of every request, along with the email address of the user who generated the token.

Every request must include three custom headers:

- `X-PW-AccessToken`: Your API key
- `X-PW-UserEmail`: The email address of the user who generated the token
- `X-PW-Application`: Set to `developer_api`

To generate an API key, log in to your Copper CRM account, navigate to Settings > API Credentials, and click Create a new API key.

### OAuth 2.0

Third-party integrations may take advantage of OAuth 2.0 for the purpose of authorizing and authenticating access to the Copper Developer API, employing the Authorization Code Grant flow.

- **Authorization endpoint:** `GET https://app.copper.com/oauth/authorize`
- **Token endpoint:** `POST https://app.copper.com/oauth/token`
- **Required credentials:** `client_id` and `client_secret` (obtained by registering your application with Copper)
- **Scope:** `developer/v1/all` (the only scope currently available)
- Currently, access tokens do not expire and do not need to be refreshed.
- Once you have obtained a valid access_token, you include it in the Authorization header of your requests.

## Features

### Contact Management (People)

Create, read, update, and delete person records in Copper. People represent individual contacts and can be searched, looked up by email, and associated with companies and opportunities. Supports contact types for categorization and bulk create/update operations.

### Company Management

Manage company records with full CRUD operations. Companies can be related to people, opportunities, and projects. Supports contact type categorization and bulk create/update operations.

### Lead Management

Manage sales leads with full CRUD operations including the ability to convert leads into people, companies, or opportunities. Leads can be categorized by customer source and lead status. Supports upsert operations (including by custom field) and bulk create/update.

### Opportunity (Deal) Management

Track sales opportunities through configurable pipelines. Opportunities have pipeline stages, customer sources, and loss reasons. You can manage pipelines and their stages, allowing you to model your sales process.

### Project Management

Create and manage projects for tracking work beyond the sales pipeline. Projects can be related to other entities in the CRM.

### Task Management

Create and manage tasks associated with CRM records. Tasks can be searched and linked to other entities.

### Activity Tracking

Log and manage activities (calls, meetings, notes, etc.) against CRM records. Supports custom activity types for tracking different kinds of interactions. Bulk creation is supported.

### Custom Fields

Define and manage custom field definitions to extend Copper's standard data model. Supports various field types including dropdowns and multi-select fields. Custom fields can be used in search filters. Connect fields allow creating custom relationships between entities.

### Related Items

Create and view relationships between different entities (e.g., linking a person to a project, a company to an opportunity). All relationships are bidirectional, and relationships can only exist between certain types of entities with additional restrictions.

### File Attachments

Upload and manage files attached to entity records. Files are uploaded via signed S3 URLs and then linked to specific entities.

### Tags

Manage tags across the CRM to categorize and organize records.

### Account and User Management

Retrieve account details and list/view users within the Copper account.

## Events

Copper supports webhooks that notify external systems when records change.

Webhooks are notifications that are sent to a specified URL that describe a certain record-related activity. Webhooks can take up to 15 minutes to deliver.

Each webhook subscription is configured with a **type** (entity) and an **event** (action). You can optionally include a custom secret key-value pair for verifying webhook authenticity.

### Supported Entity Types

The available entity types are: lead, project, task, opportunity, company, person, and activity_log.

### Supported Event Types

The available events are: new, update, and delete.

- **new**: Fires when a new entity record is created.
- **update**: Fires when any field in an existing entity record is changed. Excludes new entity relationships or any change in metadata.
- **delete**: Fires when an entity record is deleted.

The `updated_attributes` field is included only on "update" events, allowing you to see which fields changed. Webhook notifications deliver the IDs of affected records as an array, and you can configure custom HTTP headers to be passed to the endpoint.
