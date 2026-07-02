# Slates Specification for Espocrm

## Overview

EspoCRM is an open-source Customer Relationship Management (CRM) platform that allows managing contacts, accounts, leads, opportunities, cases, and other business entities. It is self-hosted and provides a REST API that mirrors all operations available through its web UI. The system is highly customizable, supporting custom entity types and fields.

## Authentication

EspoCRM is a self-hosted application, so all API requests require the **Site URL** of the specific EspoCRM instance (the URL used to access EspoCRM in the browser). The API root path is `api/v1/`.

EspoCRM supports three authentication methods, all configured through **API Users** (Administration > API Users):

### 1. API Key Authentication (Recommended for simplicity)

The simplest method. Create an API User with the "API Key" authentication method. Apply a needed role to the user to grant access to specific scopes.

Send the API key in a header with each request:

```
X-Api-Key: API_KEY_COPIED_FROM_THE_USER_DETAIL_VIEW
```

### 2. HMAC Authentication (Recommended for security)

The most secure method. Create an API User with the "HMAC authentication" method. Apply a needed role to the user to grant access to specific scopes.

The API User will have an API Key and a Secret Key. Each request requires a computed signature header:

```
X-Hmac-Authorization: base64Encode(apiKey + ':' + hashHmacSha256(method + ' /' + uri, secretKey))
```

Where `method` is GET/POST/PUT/DELETE and `uri` is the request path (e.g., `Lead/action/convert`).

### 3. Basic Authentication (Not recommended)

For regular users, EspoCRM uses Basic Authentication. A username and password (or token) are passed through the Authorization header encoded with Base64.

```
Espo-Authorization: base64Encode(username + ':' + passwordOrToken)
```

To use a token instead of a password, first obtain a token via `GET App/user` with username/password credentials. Then use the returned token for subsequent requests.

### Access Control

It's recommended to create a separate API User with specific permissions (defined by Roles) and use this user for API calls. You can have multiple API Users for different purposes, give each user specific permissions. Roles define which entity types (scopes) the API user can access and what operations they may perform.

## Features

### Contact & Account Management

Manage people and organizations as Contacts and Accounts. Create, read, update, and delete records. Link contacts to accounts and manage relationships between entities.

### Lead & Opportunity Management

Track sales leads and opportunities through configurable pipelines. Convert leads into contacts, accounts, and opportunities.

### Case Management

Track support cases/tickets, associate them with contacts and accounts, and manage their lifecycle through status stages.

### Activities & Calendar

Manage meetings, calls, tasks, and other calendar events. Associate activities with CRM records (contacts, accounts, leads, etc.).

### Email Integration

Send and receive emails within the CRM. Configure IMAP/SMTP for email accounts. Send mass emails and manage email templates.

### Stream & Activity Feed

Each record has a stream (activity feed) for notes, posts, and updates. The API allows reading and posting to streams.

### Entity Relationships

Link records together (e.g., contacts to accounts, opportunities to contacts). Add, remove, and list related records for any entity.

### Custom Entities & Fields

EspoCRM supports custom entity types and custom fields defined through the Entity Manager. The API works with custom entities the same way as built-in ones.

### File Attachments

Upload and manage file attachments associated with records.

### Data Import

Import records from CSV or other sources into the CRM.

### Document & Knowledge Base Management

Store and organize documents and knowledge base articles within the CRM.

### PDF Generation

Generate PDF documents from records using configurable templates.

### Currency Rates

Manage and retrieve currency conversion rates.

### Internationalization

Retrieve and manage language/translation data through the API.

### OpenAPI Specification

As of v9.3, the OpenAPI specification for an EspoCRM instance (including custom entity types and fields) can be obtained from the `/api/v1/OpenApi` endpoint. This is instance-specific and reflects custom configurations.

## Events

Webhooks allow other applications to subscribe to specific events happening in EspoCRM and receive data related to those events. Webhooks are supposed to be created via API by other applications. The webhook has a specific Event and URL.

Webhooks are created via `POST api/v1/Webhook` with an event name and a target URL. Request sending is processed by the scheduled job "Process Webhook Queue." By default, it runs every 5 minutes.

### Record Created (`ENTITY_TYPE.create`)

Triggered when a record of a given entity type is created. All record attributes are sent in the payload. Works for any entity type (e.g., `Contact.create`, `Lead.create`, `Account.create`).

### Record Updated (`ENTITY_TYPE.update`)

Triggered when a record is updated. Only the updated attributes are included in the payload.

### Record Deleted (`ENTITY_TYPE.delete`)

Triggered when a record is removed.

### Field Updated (`ENTITY_TYPE.fieldUpdate.FIELD`)

Triggered when a specific field on an entity is updated. New field attributes are sent in the payload. For example, `Account.fieldUpdate.assignedUserId` fires when the assigned user of an account changes.

### Configuration Options

- **`url`**: The endpoint URL that receives the webhook POST requests.
- **`skipOwn`**: Boolean option to skip events initiated by the user owning the webhook.
- Each webhook returns a **secret key** that can be used to verify request authenticity via the `Signature` header.
- The API User creating webhooks must have the _Webhooks_ scope enabled in their role, as well as access to the relevant entity types.
