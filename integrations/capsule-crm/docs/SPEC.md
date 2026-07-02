Now let me fetch the API reference page for more details on features:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Capsule CRM

## Overview

Capsule CRM is a cloud-based customer relationship management platform designed for small to mid-sized businesses. It provides contact management, sales pipeline tracking, task management, and project management capabilities. The API (v2) is RESTful and accessible at `api.capsulecrm.com`.

## Authentication

Capsule CRM supports two authentication methods. Both use Bearer tokens in the `Authorization` header for all API requests.

### 1. OAuth 2.0 (Authorization Code Grant)

Capsule implements the authorization code grant defined by RFC 6749. This is the recommended method for applications shared with other users.

- **Authorisation URL:** `https://api.capsulecrm.com/oauth/authorise`
- **Token Exchange URL:** `https://api.capsulecrm.com/oauth/token`
- **Token Revocation URL:** `https://api.capsulecrm.com/oauth/token/revoke`

**Setup:**

1. Register an application at the Capsule developer portal. Fill in the application details, including the redirect URI and scopes you require (e.g., `read`, `write`). After creating the application, note down the Client ID and Client Secret.
2. Redirect the user to the authorisation URL with `client_id`, `redirect_uri`, `response_type=code`, and `state` parameters.
3. After the user approves your application, Capsule will redirect to the URL provided in the request with a temporary code in the `code` parameter as well as the `state` you provided.
4. Exchange the code for an access token via a POST to the token exchange URL.

**Token details:**

- The token response includes `refresh_token`, `access_token`, `expires_in` (604799 seconds / ~7 days), `token_type` ("bearer"), `scope` ("read write"), and `subdomain`.
- After the access token expires, you can use the refresh token to obtain a new access token.

**Scopes:** `read`, `write`

### 2. Personal Access Token

If you're building a one-off integration for internal use, or you just want a quick start, you can generate a token directly from your Capsule account to avoid the OAuth 2 flow.

Navigate to My Preferences, then API Authentication Tokens, and under Personal Access Tokens, click the "Generate new API token" button.

All requests are made via HTTPS using: `Authorization: Bearer {token}`

## Features

### Contact Management (Parties)

Manage people and organisations (collectively called "parties") in your CRM. Create, update, delete, search, and list contacts with details including addresses, phone numbers, email addresses, websites, and job titles. Organisations can have associated employees. You can also retrieve deleted parties.

- Parties can be tagged and have custom fields attached.
- Supports customising party titles, including creating new custom titles and deleting existing ones.

### Sales Pipeline & Opportunities

Manage sales opportunities through customisable pipelines. Create and track deals with values, expected close dates, and milestone stages. Create multiple pipelines to reflect different sales processes for products and services you offer and different markets that you sell to.

- Opportunities can be linked to parties and projects.
- Pipelines can be created, duplicated, archived, and restored.
- Milestones (pipeline stages) are fully configurable.
- Lost reasons can be defined and tracked for lost deals.

### Project Management

Manage projects (formerly called "cases") with boards and stages. Projects can be associated with parties and opportunities. With the release of Project Boards, Cases have been renamed as Projects across Capsule.

- Boards and stages are configurable to reflect your workflow.
- Boards can be archived and restored.

### Task Management

Create tasks for appointments, meetings, phone calls, submission deadlines and more. Set a task to repeating daily, weekly or monthly. Tasks can be assigned to users and linked to parties, opportunities, or projects.

- Task categories can be defined and managed.

### Activity History (Entries)

Log communication history and notes against parties, opportunities, and projects. Entries represent interactions such as emails, calls, and meetings.

- Supports working with attachments on entries, including uploading and downloading attachments, as well as associating them with entries.
- Custom activity types can be defined with icons.

### Tracks (Workflow Automation)

Track Definitions are the templates used for creating Track instances, which are specific to an opportunity or project. Tracks allow you to define a series of sequential tasks that become active one after another, automating follow-up workflows.

### Filters & Search

Search across parties, opportunities, and projects using text-based search. Filters provide a structured search resource for parties, cases and opportunities, allowing for more complex search queries against specific fields and tags.

### Tags & Custom Fields

Define and manage tags to categorise contacts, opportunities, and projects. Create custom field definitions to capture data specific to your business needs. Fields can be marked as "important" to highlight them when editing records.

### Goals

Create, update, and delete Goals. Use Goals to set clear objectives, monitor progress, and celebrate success for your team and business.

- The Goals feature is available for Starter plans and above.

### Users & Teams

List and view users and teams in the account. Update user details. Teams allow grouping users for organisational purposes.

### Site & Internationalization

Retrieve site/account information. Access reference data for countries and currencies.

## Events

Capsule CRM supports webhooks through a mechanism called **REST Hooks**. REST Hooks allow you to subscribe to certain events in Capsule. When those events are triggered, Capsule will send a JSON payload to a URL that you specify, informing you of the change.

**Requirements:**

- You can subscribe to a maximum of 20 REST hooks per account, and to use them, you need to register a client application and set up OAuth authentication.
- Managing hooks requires that the user has an Administrator role on the account.

### Party Events

Triggered when a contact (person or organisation) is created, updated, or deleted.

- Events: `party/created`, `party/updated`, `party/deleted`

### Opportunity Events

Triggered when a sales opportunity is created, updated, deleted, closed, or moved to a different milestone.

- Events: `opportunity/created`, `opportunity/updated`, `opportunity/deleted`, `opportunity/closed`, `opportunity/moved`

### Project (Case) Events

Triggered when a project is created, updated, deleted, closed, or moved to a different stage.

- Events: `kase/created`, `kase/updated`, `kase/deleted`, `kase/closed`, `kase/moved`

### Task Events

Triggered when a task is created, updated, or completed.

- Events: `task/created`, `task/updated`, `task/completed`

### User Events

Triggered when a user is created, updated, or deleted.

- Events: `user/created`, `user/updated`, `user/deleted`
