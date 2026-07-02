Now let me get more details on the Database API to understand tables and records management:I have enough information to write the specification. Let me compile it now.

# Slates Specification for Softr

## Overview

Softr is a no-code platform for building web applications such as client portals, internal tools, CRMs, and dashboards. It provides its own built-in database system (Softr Databases) and connects to external data sources like Airtable, Google Sheets, and SQL databases. Softr exposes two APIs: a Studio API for managing application users, and a Database API for managing databases, tables, and records.

## Authentication

Softr uses **API Key** authentication for both of its APIs.

You can generate an API key for your Softr account to be used when interacting with the API endpoints. Navigate to Dashboard, then click on your profile icon → My account → API Settings, where you'll see a Generate API key button. As soon as you hit the button, the generated API key will appear.

You need to be the owner of the application or a workspace collaborator to be able to make API calls. Guest collaborators of the application won't be able to make calls.

Softr currently supports using personal access tokens (a.k.a API Key); OAuth access tokens will be supported later. The API Key inherits the access rights of the account of the user who grants access. More granular scopes will be supported in the future.

**How to authenticate requests:**

- **Studio API (User Management):** Pass the API key in the `Softr-Api-Key` header and the application domain in the `Softr-Domain` header. Base URL: `https://studio-api.softr.io/v1/api/`.
- **Database API:** Pass the API key in the `Softr-Api-Key` header. Base URL: `https://tables-api.softr.io/api/v1/`. All API requests must be authenticated and made through HTTPS.

## Features

### User Management

Create users inside a specified Softr app. You provide the full name, email, and optionally a password (auto-generated if omitted), and can choose whether to generate a magic link for the user. You can also delete a user from the specified Softr app.

- Generate a Magic Link for a specified user, allowing passwordless authentication.
- Sync a single user, an array of users, or trigger a user sync for all users.
- Validate a user authentication JWT token, useful when using Softr user data in external systems outside of Softr.

### Database Management

The Softr Database API can be used to integrate your data in Softr with external systems. It provides full CRUD operations on the following resources:

- **Databases:** Retrieve a list of all databases accessible to the authenticated user. Create a new database in a specified workspace. Update or delete databases.
- **Tables:** List, create, retrieve, update, and delete tables within a database.
- **Table Fields:** Manage the schema of tables by retrieving, creating, updating, and deleting fields (columns) on tables.
- **Records:** Create, read, update, delete, and search records within tables. Searching supports filtering to find specific records.

### Outbound API Calls (Call API Action)

Buttons in Softr apps can trigger an action to send POST, PUT, PATCH, or DELETE requests to any REST API or webhook endpoint, allowing integration with external services that Softr does not natively support.

- Supports sending logged-in user data and current record data as part of the request.
- This is an in-app action feature, not part of the external API.

## Events

The provider does not support events. Softr does not offer inbound webhooks or event subscription mechanisms through its API. While Softr apps can _send_ outbound webhook calls via button actions and workflows, there is no API-based mechanism to subscribe to or receive events from Softr about changes to users, databases, or records.
