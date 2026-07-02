# Slates Specification for Dynamics 365

## Overview

Microsoft Dynamics 365 is a suite of cloud-based CRM and ERP applications built on Microsoft Dataverse (formerly Common Data Service). Dynamics 365 unifies the capabilities of CRM business software and ERP systems by providing intelligent applications that seamlessly work together in the cloud. The Dynamics 365 Web API lets developers interact with CRM and ERP data using RESTful HTTP methods (GET, POST, PATCH, DELETE), built on OData standards.

## Authentication

Dynamics 365 uses **OAuth 2.0** exclusively for authentication to its online Web API. OAuth requires an identity provider for authentication. For Dataverse, the identity provider is Microsoft Entra ID.

### Prerequisites

When you connect using OAuth, you must first register an application in your Microsoft Entra ID tenant. This is done via the Azure portal under **Microsoft Entra ID → App registrations**.

You will need:

- **Client ID** (Application ID): Obtained from the app registration overview page.
- **Client Secret** or **Certificate**: Created under the app registration's "Certificates & secrets" section.
- **Tenant ID**: The directory/tenant ID from the app registration overview.
- **Instance URL**: Your Dynamics 365 environment URL (e.g., `https://yourorg.crm.dynamics.com`).

### API Permissions

Go to API permissions → Add a permission. Choose Dynamics 365 or Common Data Service. For delegated access, configure the application to have the "Access Dynamics 365 as organization users" (`user_impersonation`) delegated permission.

### Supported OAuth 2.0 Flows

**Authorization Code Flow (Delegated):** Used for interactive user-based access. The user signs in and the app acts on their behalf.

**Client Credentials Flow (Server-to-Server):** For server-to-server scenarios, there isn't an interactive user account to authenticate. In these cases, you need to provide some means to confirm that the application is trusted. You must configure a secret for the app registration OR upload a public key certificate. An Application User must also be created in Dynamics 365 and assigned a security role.

### Token Endpoints

- **Authorization endpoint:** `https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize`
- **Token endpoint:** `https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token`

### Scopes

Scope must be specified using the Scope property when retrieving the OAuth tokens. The value of the Scope property may consist of an OAuth scope or a space-separated list of OAuth scopes.

- For client credentials flow: `https://{yourorg}.crm.dynamics.com/.default`
- For delegated flow: `https://{yourorg}.crm.dynamics.com/user_impersonation` (optionally with `offline_access` for refresh tokens)

### Example (Client Credentials)

```
POST https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={client_id}
&client_secret={client_secret}
&scope=https://yourorg.crm.dynamics.com/.default
&grant_type=client_credentials
```

The resulting access token is passed as a Bearer token in the `Authorization` header for all API requests.

## Features

### Record Management (CRUD Operations)

Create, Read, Update, and Delete (CRUD) operations can be easily performed through the use of the Microsoft Dynamics 365 Web API. This covers all Dataverse entities including standard entities (accounts, contacts, leads, opportunities, cases, etc.) and custom entities. Developers can use POST requests to create table rows, deep insert to create multiple related rows, and use `@odata.bind` to associate new rows to existing tables.

### Data Querying

By using this API, raising advanced data queries becomes easier. You can allow the Microsoft Dynamics API to filter, paginate, and sort data. By using different functions and actions, performing complex operations becomes possible. Standard OData query options are supported: `$filter`, `$select`, `$orderby`, `$expand`, and `$top`. FetchXML, a proprietary query language, provides capabilities to perform aggregation.

### Metadata and Schema Discovery

Interact with your metadata by using Microsoft Dynamics 365 Web API to get a grip of the Dynamics 365 schema. These different attributes interact with definitions, structures, entities, attributes, relationships, and other schema elements. By understanding the metadata, your application can adapt to the changes you would need to make in the schema.

### Functions and Actions

The Web API supports invoking bound and unbound functions (read-only operations) and actions (operations that may have side effects). These include built-in operations like `WhoAmI`, `InitializeFrom`, and the ability to invoke custom actions defined in the Dynamics 365 environment.

### Duplicate Detection

In Dynamics 365, there is a feature known as "Duplicate Detection Rules." When the feature was initially released, they only executed based on end user interaction. With the Dataverse Web API, Developers can set the `MSCRM.SuppressDuplicateDetection: false` header to enable duplicate detection using existing rules.

### Relationship Management

Records can be associated and disassociated through the API. Navigation properties allow traversing relationships between entities (e.g., retrieving all contacts for an account). The `$expand` query option enables fetching related records in a single request.

### Search

The Dataverse Search API provides relevance-based search capabilities across multiple entities, enabling full-text search across the Dynamics 365 environment.

### File and Image Management

The Web API supports uploading and downloading files and images stored in file-type or image-type columns on entities.

## Events

Dynamics 365 supports webhooks for real-time event-driven integrations. The webhook mechanism differs between Dynamics 365 Customer Engagement (CE) / Dataverse and Dynamics 365 Business Central.

### Dynamics 365 CE / Dataverse Webhooks

Dynamics 365 supports registering webhooks through plugin steps that execute when specific messages (create, update, delete, etc.) occur. Webhooks are registered using the Plugin Registration Tool.

- **Supported event messages:** Create, Update, Delete, Assign, and Status Change.
- **Entity scope:** Webhooks can be registered against any entity (e.g., account, contact, opportunity, lead, case, or custom entities). You specify the entity and optionally specific attributes to filter on.
- **Execution mode:** Webhooks enable synchronous and asynchronous steps.
- **Payload:** Webhooks send POST requests with JSON payload and can be consumed by any programming language or web application hosted anywhere. The payload includes entity name, entity ID, message name, organization, initiating user, and execution context data.
- **Retry behavior:** Dynamics 365 will retry failed Webhook requests up to three times before marking them as failed.
- **Limitations:** Cannot modify CRM data directly (use plugins for that).

### Dynamics 365 Business Central Webhooks

In Dynamics 365 Business Central, every entity exposed as API supports webhooks natively. Subscriptions are created via the Subscriptions API.

- **Supported events:** Notifications are triggered when an API-exposed entity is created, updated, or deleted.
- **Registration:** You need to register a webhook subscription with the entities you want to be subscribed to by providing a notification URL. A handshake via validation token is required.
- **Subscription expiry:** Webhook subscriptions expire in 3 days (default value) and must be renewed via PATCH request.
- **Notification behavior:** Dynamics 365 Business Central will not send a notification immediately when an entity changes (normally it occurs some minutes). This is by design in order to permit to send a single notification even though the entity might have changed several times within a few seconds.
