# Slates Specification for SharePoint

## Overview

SharePoint is Microsoft's cloud-based platform for document management, content collaboration, and intranet sites, available as part of Microsoft 365. It allows teams to create sites, store and organize files, manage lists, and work together from anywhere. SharePoint can be accessed programmatically via two APIs: the legacy SharePoint REST API (for deep SharePoint-specific operations) and the Microsoft Graph API (the recommended, unified approach for accessing SharePoint alongside other Microsoft 365 services).

## Authentication

SharePoint Online uses **OAuth 2.0** via **Microsoft Entra ID** (formerly Azure AD) for authentication. Both the SharePoint REST API and the Microsoft Graph API use OAuth 2.0 as their standard authentication method.

### Setup

You need to register an app in your Azure Active Directory, obtain the Client ID and Client Secret values, and then use those to obtain an Access Token. You will need the following credentials:

- **Tenant ID**: Identifies the Microsoft Entra ID tenant (directory).
- **Client ID** (Application ID): Identifies the registered application.
- **Client Secret** or **Certificate**: Used to authenticate the application.
- **Redirect URI for local CLI auth**: `http://localhost:45873/callback`

### OAuth 2.0 Flows

1. **Authorization Code Flow (Delegated)**: For acting on behalf of a signed-in user. The user signs in and grants consent. The authorization and token endpoints are:
   - Authorization: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`
   - Token: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`

2. **Client Credentials Flow (Application-only)**: The application can interact with data on its own, without a signed-in user. App-only access is used in scenarios such as automation and backup, and is mostly used by apps that run as background services or daemons. The token request uses:
   - `grant_type=client_credentials`
   - `scope=https://graph.microsoft.com/.default` (for Microsoft Graph) or `scope=https://{tenant}.sharepoint.com/.default` (for the SharePoint REST API directly)

### Scopes / Permissions

Permissions are configured on the app registration in Microsoft Entra ID. There are two types:

- **Delegated permissions** (scopes): Allow the application to act on behalf of the signed-in user.
- **Application permissions** (app roles): Allow the app to access data on its own, without a signed-in user.

Key SharePoint-related scopes for Microsoft Graph include:

- `Sites.Read.All`, `Sites.ReadWrite.All`, `Sites.Manage.All`, `Sites.FullControl.All`
- `Files.Read.All`, `Files.ReadWrite.All`
- `User.Read`, `offline_access`
- `Sites.Selected` — restricts an application's access to specific site collections. Now lists, list items, folders, and files are also supported, and all Selected scopes support delegated and application modes.

Application permissions typically require admin consent. Access tokens generated for Microsoft Graph resources are not valid for the SharePoint REST API — use the correct audience (`https://graph.microsoft.com` vs. `https://{tenant}.sharepoint.com`) depending on which API you call.

### Certificate-Based Authentication

For unattended (app-only) access, authentication can also be done using a certificate instead of a client secret. If you want a delegated call on behalf of a user, you don't need certificate authentication.

## Features

### Site Management

The SharePoint API in Microsoft Graph supports access to SharePoint sites, lists, and drives (document libraries), with read-only support for site resources (no ability to create new sites) and read-write support for lists, listItems, and driveItems. You can retrieve site properties, search for sites, and access sites associated with Microsoft 365 groups or Teams.

### Lists and List Items

Lists are the foundation for data storage in SharePoint. You can create lists to store a variety of business data, from a simple customer contact list to a custom business application. When you use columns to define your schema, SharePoint can protect the integrity of your data as well as enable rich indexing, querying, and search capabilities. The API supports full CRUD operations on lists and list items, including defining custom columns.

### Document Libraries and Files

SharePoint stores files in a special list type called a document library. You can use the OneDrive API to work with a library as a drive, or the SharePoint API to work with it as a list. Just like a regular list, you can extend the schema of a Document Library to support your business needs with custom columns. This includes uploading, downloading, moving, copying, and versioning files.

### Search

The Microsoft Search API in Microsoft Graph can search content stored in OneDrive or SharePoint: files, folders, lists, list items, or sites. Search supports filtering by entity type and using KQL query templates.

### Permissions Management

SharePoint supports managing permissions at the site, list, and item level. Through the Graph API and the Selected permissions model, applications can be granted granular access to specific resources. OneDrive for Business and SharePoint support sending notifications of security events on a driveItem. You can subscribe to these events to receive notifications when the permissions on an item change.

### Content Types and Columns

SharePoint allows defining reusable content types and site columns that govern the schema and metadata of lists and libraries. These can be managed via the API.

## Events

SharePoint supports webhooks through two mechanisms: native SharePoint webhooks and Microsoft Graph change notifications (subscriptions).

### SharePoint Native Webhooks (List/Library Changes)

The SharePoint list webhooks cover the events corresponding to list item changes for a given SharePoint list or a document library. SharePoint webhooks only support asynchronous events. This means that webhooks are only fired after a change happened (similar to -ed events), and thus synchronous (-ing events) are not possible.

- **Supported resources**: SharePoint lists and document libraries.
- **Events**: Item added, item updated, item deleted, item moved/renamed, item checked in/out, item attachment changes.
- The notification doesn't include any information about the changes that triggered it. Your application is expected to use the GetChanges API on the list to query the collection of changes from the change log.
- **Subscription expiration**: Webhook subscriptions are set to expire after 180 days by default. You need to set an expiration date when creating the subscription, and the expiration date should be less than 180 days.
- Subscriptions require specifying a notification URL, and SharePoint validates the endpoint upon creation.

### Microsoft Graph Change Notifications (SharePoint Resources)

Change notifications enable applications to receive alerts when a Microsoft Graph resource they're interested in changes (created, updated, or deleted). Microsoft Graph sends notifications to the specified client endpoint.

- **Supported SharePoint resources**: Sites, lists, list items, and drives (document libraries via driveItem hierarchy).
- **Change types**: `created`, `updated`, `deleted` (specified when creating the subscription).
- Microsoft Graph supports basic notifications (containing only the resource ID), and rich notifications (including the resource data of the changed object).
- **Delivery channels**: The Microsoft Graph REST API can deliver change notifications through webhooks, Event Hubs, and Event Grid.
- Subscriptions must be renewed before expiration. SharePoint currently does not support subscribing to a single folder; you can only subscribe at the list level.
