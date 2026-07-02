Let me get the full list of webhook event objects and OAuth scopes.Now I have all the information needed. Let me compose the specification.

# Slates Specification for Pipedrive

## Overview

Pipedrive is a cloud-based CRM platform designed for sales teams to manage their sales pipelines, deals, contacts, activities, and products. Pipedrive offers a RESTful API suitable for building apps and integrations around Pipedrive, covering deals, leads, persons, organizations, activities, products, and more.

## Authentication

Pipedrive supports two authentication methods:

### 1. API Token

Use the API token for your own internal tools that are running on a secure server. The API token must be provided in the `x-api-token` header.

- The token can be found in the Pipedrive web app under **Settings > Personal preferences > API**.
- You can only have one valid API token at a time. Generating a new one will invalidate the previous token.
- You'll need a separate API token for each company you're added to.
- API requests are made to `https://{COMPANYDOMAIN}.pipedrive.com/api/v1/`.

### 2. OAuth 2.0 (Authorization Code Flow)

The recommended authorization protocol for all public apps available in the Pipedrive Marketplace is the industry-standard OAuth 2.0 protocol.

- **Authorization endpoint:** `https://oauth.pipedrive.com/oauth/authorize`
- **Token endpoint:** `https://oauth.pipedrive.com/oauth/token`
- **Revocation endpoint:** `https://oauth.pipedrive.com/oauth/revoke`
- **Credentials required:** `client_id` and `client_secret`, obtained by registering an app in the Pipedrive Developer Hub.
- Token exchange is authenticated via Base64-encoded string containing the client_id and client_secret values. The header value should be `Basic <base64(client_id:client_secret)>`.
- Access tokens are short-lived (typically 1 hour). After the period expires, the access_token will be invalid. To refresh the access_token, you must use the refresh_token.
- API requests use the `Authorization: Bearer {access_token}` header and are made to `https://{COMPANYDOMAIN}.pipedrive.com/api/v1/`.

### OAuth 2.0 Scopes

Scopes follow a `{resource}:{permission}` pattern. The available scopes are:

| Scope                    | Description                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| `base`                   | Basic info (always enabled): authorized user settings, currencies              |
| `deals:read`             | Read deals, pipelines, stages, notes, files, filters, statistics               |
| `deals:full`             | Full CRUD on deals, participants, followers, notes, files, filters             |
| `mail:read`              | Read mail threads and messages                                                 |
| `mail:full`              | Read, update, delete mail threads and messages                                 |
| `activities:read`        | Read activities, activity fields and types                                     |
| `activities:full`        | Full CRUD on activities, files, filters                                        |
| `contacts:read`          | Read persons, organizations, related fields, followers                         |
| `contacts:full`          | Full CRUD on persons, organizations, followers, notes, files                   |
| `products:read`          | Read products, product fields, followers                                       |
| `products:full`          | Full CRUD on products and product fields                                       |
| `deal-fields:full`       | Full CRUD on deal custom fields                                                |
| `product-fields:full`    | Full CRUD on product custom fields                                             |
| `contact-fields:full`    | Full CRUD on person and organization custom fields                             |
| `users:read`             | Read users, permissions, roles, teams                                          |
| `recents:read`           | Read recent changes across the account                                         |
| `search:read`            | Search across deals, persons, organizations, files, products                   |
| `admin`                  | Manage pipelines, stages, fields, activity types, users, permissions, webhooks |
| `leads:read`             | Read leads and lead labels                                                     |
| `leads:full`             | Full CRUD on leads and lead labels                                             |
| `goals:read`             | Read goals                                                                     |
| `goals:full`             | Full CRUD on goals                                                             |
| `projects:read`          | Read projects, boards, phases, tasks, templates                                |
| `projects:full`          | Full CRUD on projects and tasks                                                |
| `webhooks:read`          | Read webhooks created by the app                                               |
| `webhooks:full`          | Create, read, and delete webhooks                                              |
| `phone-integration`      | Log calls and play recordings                                                  |
| `video-calls`            | Register as video call provider and create conference links                    |
| `messengers-integration` | Register as messaging integration provider                                     |

## Features

### Deals Management

Create, read, update, delete, and merge deals in sales pipelines. Deals can have participants, followers, products, notes, files, and activities attached. Deals move through configurable pipeline stages. Supports archiving, duplicating, and converting deals to/from leads.

### Leads Management

Leads are prequalified, potential deals that are kept in a separate inbox called the Leads Inbox. Leads can subsequently be converted to deals via the Pipedrive web app and added to a pipeline. Leads support labels, sources, notes, and activities. Leads can be searched and archived.

### Contacts (Persons & Organizations)

Manage persons and organizations as contact records. Persons and organizations can be linked, merged, searched, and have followers, notes, files, and custom fields. Organization relationships can be defined to model parent-child or related company structures.

### Activities

Schedule and track activities (calls, meetings, tasks, etc.) linked to deals, persons, or organizations. Custom activity types can be configured. Activities can be filtered by user, type, or related entity.

### Products

Manage a product catalog with pricing, custom fields, variations, and images. Products can be attached to deals with quantities and pricing. Product fields are independently customizable.

### Pipelines & Stages

Configure sales pipelines with ordered stages. Deals flow through stages within a pipeline. Provides conversion and movement statistics per pipeline.

### Notes & Files

Attach notes (with comments) and files to deals, persons, organizations, and leads. Supports both direct file uploads and remote file links.

### Mail Tracking

Mail is tracked and associated with persons and deals through Pipedrive's email sync and Smart Bcc features. Read mail threads and messages linked to contacts and deals.

### Projects & Tasks

Manage projects with boards, phases, and tasks. Projects can be linked to deals and contacts. Project templates provide reusable workflows.

### Goals

Define and track sales goals. Goals can be assigned to a company, team, or individual user, with configurable intervals and result tracking.

### Users & Permissions

Read user data, permission sets, roles, and team assignments. Admin-level access allows managing users, roles, and permission structures.

### Custom Fields

Entity fields endpoints allow you to obtain the near-complete schema of the respective core entities. You can add, update, and delete main and custom fields through these adjacent entities. Custom fields are supported on deals, persons, organizations, and products.

### Search

Search globally across deals, leads, persons, organizations, files, and products. Supports field-level search for precise queries.

### Subscriptions & Installments

Manage recurring and installment-based subscriptions attached to deals, including payment tracking.

### Call Logging

Log call metadata (duration, outcome, etc.) and attach call recordings to Pipedrive via the phone integration scope.

### Filters

Create and manage reusable filters for deals, persons, organizations, activities, and products to segment data views.

## Events

Pipedrive supports webhooks that send HTTP POST requests with JSON payloads when events occur. Events in Pipedrive are triggered both from the Pipedrive UI and from the API calls. Webhooks can be created via the API or through the Pipedrive UI under **Tools and integrations > Webhooks**.

Each webhook is configured with two parameters:

- **Event action:** `create`, `change`, `delete`, or `*` (wildcard for all actions)
- **Event object:** The entity type to monitor, or `*` (wildcard for all objects)

As each webhook event is checked against a user's permissions, the webhook will only be sent if the user has access to the specified object(s).

### Supported Event Objects

| Event Object   | Description                                   |
| -------------- | --------------------------------------------- |
| `deal`         | Deal created, updated, or deleted             |
| `lead`         | Lead created, updated, or deleted             |
| `person`       | Person (contact) created, updated, or deleted |
| `organization` | Organization created, updated, or deleted     |
| `activity`     | Activity created, updated, or deleted         |
| `product`      | Product created, updated, or deleted          |
| `note`         | Note created, updated, or deleted             |
| `pipeline`     | Pipeline created, updated, or deleted         |
| `stage`        | Stage created, updated, or deleted            |
| `user`         | User created, updated, or deleted             |

Wildcards (`*`) can be used for both event actions and event objects to receive broad notifications (e.g., `*.*` for all events, `create.*` for all creates, `*.deal` for all deal events).

Admin users can manage webhooks for all users in their company, including the maximum limit of 40 per user. Pipedrive allows up to 100 webhooks per company account.
