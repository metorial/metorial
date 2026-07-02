# Slates Specification for Zoho CRM

## Overview

Zoho CRM is a cloud-based customer relationship management platform that manages sales, marketing, and support processes. It is an online Sales CRM software that manages your sales, marketing and support in one CRM platform. This integration targets the current Zoho CRM V8 APIs for programmatic access to CRM data including leads, contacts, deals, accounts, tasks, and other standard and custom modules.

## Authentication

Zoho CRM uses OAuth 2.0 exclusively for authentication — it does not support static API keys. The implementation uses the authorization code grant type.

**Setup:**

1. Register your application at the Zoho API Console (https://api-console.zoho.com). On successful registration, you will get a Client ID and Client Secret.
2. You must provide a Client Name, Homepage URL, and Authorized Redirect URI when registering.

**Authorization Flow:**

1. Redirect the user to the authorization endpoint to obtain a grant token (authorization code):
   - **Authorization URL:** `https://accounts.zoho.com/oauth/v2/auth`
   - Parameters: `client_id`, `redirect_uri`, `scope`, `response_type=code`, `access_type=offline`
2. Exchange the authorization code for tokens at the token endpoint:
   - **Token URL:** `https://accounts.zoho.com/oauth/v2/token`
   - Parameters: `client_id`, `client_secret`, `code`, `redirect_uri`, `grant_type=authorization_code`
3. Access tokens are passed in the Authorization header with the prefix `Zoho-oauthtoken`.

**Token Lifecycle:**

- Access tokens are valid for 1 hour. Refresh tokens can be used to obtain new access tokens and have an unlimited lifetime until revoked.

**Data Center URLs:**

Your data center (DC) base URL for Zoho Accounts varies by region (US, EU, IN, AU, JP, CA, SA, CN); the same DC must be used for generating and refreshing tokens. Examples:

- US: `https://accounts.zoho.com`
- EU: `https://accounts.zoho.eu`
- IN: `https://accounts.zoho.in`
- AU: `https://accounts.zoho.com.au`

**Scopes:**

Scopes contain three parameters — service name, scope name, and operation type. The format is `scope=service_name.scope_name.operation_type`.

- Key scope categories include: `ZohoCRM.modules.*` (for module data like leads, contacts, deals), `ZohoCRM.modules.notes.*`, `ZohoCRM.modules.attachments.*`, `ZohoCRM.settings.*` (for CRM settings like fields, layouts, custom views, tags, and related lists), `ZohoSearch.securesearch.READ` (for Search Records), and `ZohoCRM.notifications.*` (for notification subscriptions).
- You can set specific permissions like READ, CREATE, UPDATE, DELETE, or ALL for each module.
- Example: `ZohoCRM.modules.leads.READ` for read-only access to leads, or `ZohoCRM.modules.ALL` for full access to all modules.

## Features

### Record Management

Access and work with almost all of Zoho CRM's components using the REST API. Fetch, create, update or delete any sort of information stored in your account. Supported modules include Leads, Contacts, Accounts, Deals, Tasks, Events, Calls, Campaigns, Products, Quotes, Sales Orders, Purchase Orders, Invoices, Vendors, Price Books, Cases, Solutions, and custom modules.

### Search and Querying

Construct custom queries to fetch data from your Zoho CRM account. CRM Object Query Language (COQL) uses a simple SELECT query structure to fetch records using a SQL-like syntax. Standard search by criteria, email, phone, or word is also available.

### User and Organization Management

Retrieve users' data, add users, update user details, and delete users from your organization. You can also manage user territories and transfer records between users. Organization-level settings and license information are accessible.

### Module and Field Metadata

Access metadata about modules, fields, layouts, custom views, and related lists. This allows dynamic discovery of the CRM's data structure including custom modules, field API names, custom view IDs, and related list API names.

### File Management

List, upload, download, and delete attachments associated with CRM records. Downloaded file bytes must be returned through Slate attachments rather than inline output fields.

### Tags and Notes

Organize records with tags and associate notes with records across modules. Notes can be listed, created, updated, and deleted.

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
