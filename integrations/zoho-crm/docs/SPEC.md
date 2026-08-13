# Zoho CRM Integration Specification

## Overview

Zoho CRM is a cloud-based customer relationship management platform that manages sales, marketing, and support processes. It is an online Sales CRM software that manages your sales, marketing and support in one CRM platform. This integration targets the current Zoho CRM V8 APIs for programmatic access to CRM data including leads, contacts, deals, accounts, tasks, and other standard and custom modules.

## Authentication

Zoho CRM uses OAuth 2.0 exclusively for authentication. The integration exposes one OAuth method for a customer-owned regular regional or Multi-DC server application. `applicationType` is required. `region` is required for a regional application and optional for Multi-DC as an expected-region constraint.

**Setup:**

1. Register a regular regional or Multi-DC server application at the Zoho API Console (https://api-console.zoho.com). Supply its Client ID and Client Secret when connecting; they are used unchanged.
2. You must provide a Client Name, Homepage URL, and Authorized Redirect URI when registering.

**Authorization Flow:**

1. Regional authorization starts at the selected regional Accounts origin. Multi-DC authorization starts at `https://accounts.zoho.com/oauth/v2/auth`.
2. The callback must include matching `location` and `accounts-server` values. The authorization code is exchanged at that exact validated regional Accounts origin. The inferred region must match the regional selection or an optional Multi-DC expected-region constraint.
3. Refresh requests continue to use the persisted regional Accounts origin and preserve the existing refresh token if Zoho omits a replacement.
4. CRM requests use the allowlisted `api_domain` returned by the token response. Access tokens are sent with the `Zoho-oauthtoken` authorization scheme.

**Token Lifecycle:**

- Access tokens are valid for 1 hour. Refresh tokens can be used to obtain new access tokens and have an unlimited lifetime until revoked.

**Supported Data Centers:**

| Region | Accounts origin | Allowed CRM API origin |
| --- | --- | --- |
| US | `https://accounts.zoho.com` | `https://www.zohoapis.com` |
| EU | `https://accounts.zoho.eu` | `https://www.zohoapis.eu` |
| IN | `https://accounts.zoho.in` | `https://www.zohoapis.in` |
| AU | `https://accounts.zoho.com.au` | `https://www.zohoapis.com.au` |
| JP | `https://accounts.zoho.jp` | `https://www.zohoapis.jp` |
| CA | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca` |
| SA | `https://accounts.zoho.sa` | `https://www.zohoapis.sa` |
| UK | `https://accounts.zoho.uk` | `https://www.zohoapis.uk` |
**Scopes:**

Scopes contain three parameters — service name, scope name, and operation type. The format is `scope=service_name.scope_name.operation_type`.

- Key scope categories include: `ZohoCRM.modules.*` (for module data like leads, contacts, deals), `ZohoCRM.modules.notes.*`, `ZohoCRM.modules.attachments.*`, `ZohoCRM.settings.*` (for CRM settings like fields, layouts, custom views, tags, and related lists), `ZohoSearch.securesearch.READ` (for Search Records), and `ZohoCRM.notifications.*` (for notification subscriptions).
- You can set specific permissions like READ, CREATE, UPDATE, DELETE, or ALL for each module.
- Example: `ZohoCRM.modules.leads.READ` for read-only access to leads, or `ZohoCRM.modules.ALL` for full access to all modules.

#### Declared Scope Contract

```ts
[
  'ZohoCRM.modules.ALL',
  'ZohoCRM.settings.ALL',
  'ZohoCRM.notifications.ALL',
  'ZohoCRM.users.READ',
  'ZohoCRM.org.READ',
  'ZohoCRM.coql.READ',
  'ZohoSearch.securesearch.READ',
  'ZohoCRM.send_mail.all.CREATE'
]
```

| Capability group | Retained scope |
| --- | --- |
| Record, related-record, note, and attachment CRUD | `ZohoCRM.modules.ALL` |
| Module, field, layout, custom-view, related-list, and tag metadata | `ZohoCRM.settings.ALL` |
| Notification subscriptions | `ZohoCRM.notifications.ALL` |
| User and organization discovery | `ZohoCRM.users.READ`, `ZohoCRM.org.READ` |
| COQL and record search | `ZohoCRM.coql.READ`, `ZohoSearch.securesearch.READ` |
| Record email sending | `ZohoCRM.send_mail.all.CREATE` |

The [CRM scope catalog](https://www.zoho.com/crm/developer/docs/api/v8/scopes.html) documents module/settings/notification coverage and independent user, organization, COQL, and search namespaces. The [notes](https://www.zoho.com/crm/developer/docs/api/v8/get-notes.html) and [attachment](https://www.zoho.com/crm/developer/docs/api/v8/get-attachments.html) endpoint documentation accepts ZohoCRM.modules.ALL, so redundant notes and attachment scopes are omitted. The [send-mail endpoint](https://www.zoho.com/crm/developer/docs/api/v8/send-mail.html) retains its independent create scope.

## Features

### Record Management

Access and work with almost all of Zoho CRM's components using the REST API. Fetch, create, update or delete any sort of information stored in your account. Supported modules include Leads, Contacts, Accounts, Deals, Tasks, Events, Calls, Campaigns, Products, Quotes, Sales Orders, Purchase Orders, Invoices, Vendors, Price Books, Cases, Solutions, and custom modules.

Related-record reads always send the Zoho CRM V8 mandatory `fields` query parameter. Callers may select related-module field API names; otherwise the integration requests `id`.

### Search and Querying

Construct custom queries to fetch data from your Zoho CRM account. CRM Object Query Language (COQL) uses a simple SELECT query structure to fetch records using a SQL-like syntax. Standard search by criteria, email, phone, or word is also available.

### User and Organization Management

Retrieve users' data, add users, update user details, and delete users from your organization. You can also manage user territories and transfer records between users. Organization-level settings and license information are accessible.

### Module and Field Metadata

Access metadata about modules, fields, layouts, custom views, and related lists. This allows dynamic discovery of the CRM's data structure including custom modules, field API names, custom view IDs, and related list API names.

### File Management

List, upload, download, and delete attachments associated with CRM records. Downloaded file bytes are returned as downloadable files rather than inline output fields.

### Tags and Notes

Organize records with tags and associate notes with records across modules. Notes can be listed, created, updated, and deleted.

Tag operations follow the Zoho CRM V8 [Get Tags](https://www.zoho.com/crm/developer/docs/api/v8/get-tag-list.html), [Add Tags](https://www.zoho.com/crm/developer/docs/api/v8/add-tags.html), and [Remove Tags](https://www.zoho.com/crm/developer/docs/api/v8/remove-tags.html) contracts. Record tags are edition-gated by Zoho CRM and use edition-specific limits.

### Email and Communication

Send emails from CRM and track email interactions linked to CRM records.

## Events

Zoho CRM supports two event mechanisms: **Notification APIs** (push-based watch/subscribe) and **Webhooks** (triggered via workflow rules).

### Notification API (Record Watch)

Notification APIs allow you to get instant notifications whenever an action is performed on the records of a module. The system notifies you of the event on a provided URL. You can enable notifications based on a specific operation like create, update, or delete.

- Events are subscribed per module and operation, e.g., `Leads.create`, `Sales_Orders.edit`, `Contacts.delete`, or `Deals.all`.
- Field-specific notifications allow you to get notifications only when specific fields of a module change, such as when a Deal's Stage is updated. Specify criteria in the `notification_condition` array.
- Subscriptions require a `channel_id`, `notify_url`, and have a configurable expiry time (`channel_expiry`) after which they must be renewed.
- A verification `token` can be set to validate that notifications originate from Zoho CRM.

### Webhooks (Workflow-Based)

Webhooks facilitate communication with third-party applications by sending instant web notifications every time an event occurs in Zoho CRM. You can configure HTTP URLs and associate them in workflow rules to automate the notification process.

- You can set up webhooks for most CRM primary modules, such as Leads, Accounts, Contacts, Potentials (Opportunities), Events, and Tasks.
- Webhooks are configured as actions within workflow rules, meaning they are triggered based on record creation, edit, or field updates as defined by the workflow criteria.
- Webhooks cannot be set up for Call Logs and Notes modules.
- Webhook payloads can include dynamic CRM field data using merge fields and custom static parameters.
