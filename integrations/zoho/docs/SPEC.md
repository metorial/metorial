# Slates Specification for Zoho

## Overview

Zoho is an Indian multinational technology company offering a suite of over 55 cloud-based software products covering CRM, accounting, HR, project management, helpdesk, email, marketing, analytics, and more. Zoho has over 45 integrated applications, mainly designed for small and medium-sized businesses (SMBs), but scalable for larger enterprises, spanning categories including customer relationship management, marketing, sales, customer support, finance, human resources, collaboration, productivity, operations, IT management, and analytics. All Zoho products share a unified authentication system through Zoho Accounts.

## Authentication

Zoho uses **OAuth 2.0** as its authentication protocol across all products. OAuth 2.0 allows you to grant a third-party application delegated access to the protected resources of Zoho via Zoho APIs.

### Registration

To access the resources of Zoho using the various Zoho APIs, you will need to register your application with Zoho first. On successful registration, you will get a Client ID and Client secret, which you can use to get the access token needed to make API calls.

Register at the **Zoho API Console**: `https://api-console.zoho.com/`

Client types supported:

- **Server-based Applications**: Web apps running on a dedicated HTTP server (standard for integrations).
- **Client-based Applications**: Browser-only apps independent of a web server.
- **Mobile Applications**: Apps installed on smartphones and tablets.
- **Non-browser Mobile Applications**: Devices without browser provisioning (smart TVs, printers).
- **Self Client**: Stand-alone applications that perform only back-end jobs (without any manual intervention) like data sync.

### OAuth 2.0 Flow (Authorization Code Grant)

Zoho uses the **authorization code grant type**. The flow is:

1. **Authorization Request**: Redirect user to:

   ```
   https://accounts.zoho.com/oauth/v2/auth?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&scope={scope}&access_type=offline
   ```

2. **Exchange Code for Tokens**: POST to:

   ```
   https://accounts.zoho.com/oauth/v2/token
   ```

   With parameters: `client_id`, `client_secret`, `grant_type=authorization_code`, `code`, `redirect_uri`.

3. **Use Access Token**: Zoho's OAuth implementation uses Bearer authentication scheme; the access token must be passed in the Authorization header with the prefix `Zoho-oauthtoken`.

   ```
   Authorization: Zoho-oauthtoken {access_token}
   ```

4. **Refresh Token**: Access tokens are valid for only 1 hour. A refresh token can be retrieved and stored, and allows the app to generate a new access token whenever required. A refresh token does not expire. Set `access_type=offline` in the authorization request to receive a refresh token.

### Scopes

Scope limits the level of access the application can have. For example, if the client only needs to access the Invoices module in Zoho Books, that can be defined in the scope. The resource server will provide access only to that module. It can also be defined what kind of operations (create/read/update/delete) are permissible.

Scope format: `ServiceName.ScopeName.OperationType`

- **ServiceName**: The Zoho product (e.g., `ZohoCRM`, `ZohoBooks`, `ZohoDesk`, `ZohoPeople`, `ZohoProjects`, `ZohoMail`, etc.)
- **ScopeName**: The module within the service (e.g., `modules`, `contacts`, `users`, `settings`)
- **OperationType**: Can be ALL, READ, UPDATE, DELETE (ALL gives access to perform all operations).

Examples: `ZohoCRM.modules.leads.READ`, `ZohoBooks.purchaseorders.UPDATE`, `ZohoCRM.settings.ALL`

Multiple scopes should be separated by commas.

### Data Centers / Multi-DC

Data protection and privacy laws in multiple countries state that user data can only be stored in data centers located on that country's soil. In compliance, Zoho has set up data centers in multiple countries. Each data center only holds the data of users who have registered at that domain.

The authorization and API base URLs differ by data center:

| Region    | Accounts URL           | API Domain            |
| --------- | ---------------------- | --------------------- |
| US        | `accounts.zoho.com`    | `www.zohoapis.com`    |
| EU        | `accounts.zoho.eu`     | `www.zohoapis.eu`     |
| India     | `accounts.zoho.in`     | `www.zohoapis.in`     |
| Australia | `accounts.zoho.com.au` | `www.zohoapis.com.au` |
| Japan     | `accounts.zoho.jp`     | `www.zohoapis.jp`     |
| Canada    | `accounts.zoho.ca`     | `www.zohoapis.ca`     |

In the authorization request, you send calls to `https://accounts.zoho.com`. In the response, the location of the user's DC will be included as the parameter `location`. Once you have identified the user's data center, you need to make the access token request to the server URL corresponding to that location. For example, if location=eu, you will need to make access token request to `https://accounts.zoho.eu`.

## Features

### CRM (Zoho CRM)

Manage the full sales lifecycle including leads, contacts, accounts, deals, tasks, events, and calls. Access and work with almost all of Zoho CRM's components using REST API. Fetch, create, update or delete any sort of information stored in your account. Use simple HTTP methods to fetch components like records, modules, and custom views.

- Supports custom modules and fields.
- CRM Object Query Language (COQL) allows constructing queries to fetch data, similar to MySQL SELECT queries.
- Bulk API for retrieving or uploading large amounts of data asynchronously, useful for migration, data backup, and initial sync.

### Helpdesk (Zoho Desk)

Manage support tickets, contacts, accounts, tasks, calls, and events. A webhook pushes relevant information to the callback URL whenever an event, such as adding a ticket or updating a contact, occurs in the help desk.

- Supports department-based filtering.
- Includes instant messaging session and message management.

### Accounting & Finance (Zoho Books)

The Zoho Books API allows you to perform many accounting operations that you do with the web client. This generic Zoho package currently implements organizations, invoices, contacts, and expenses.

- There are 8 different domains for Zoho Books' APIs, and you must use the one applicable to your organization.
- Requires an Organization ID for API calls.

### HR Management (Zoho People)

Manage employee records, forms, leave, attendance, timesheets, and HR processes. Zoho People APIs use selected scopes, which control the type of resource that the client application can access.

- Supports custom forms and fields.

### Project Management (Zoho Projects)

Zoho Projects provides REST APIs to manage projects, connect third party applications, and transfer or retrieve data. This generic Zoho package currently implements portal discovery, project management, task management, and milestone listing.

- Supports custom modules with configurable layouts.
- Requires a Portal ID in API calls.

### Out Of Scope For This Generic Package

Zoho Mail, Campaigns, Analytics, Creator, Billing, Sign, ZeptoMail, and other product-specific APIs are not implemented in this package. Use dedicated Zoho service integrations when those surfaces are needed.

## Events

Zoho supports webhooks and notification subscriptions across several products, though the mechanism varies by product. This package implements CRM notification registration and Desk event request handling.

### Zoho CRM — Notification API (Watch API)

On trigger of any notification-enabled event in a module, Zoho CRM sends a notification to the user through the notify URL. You can set up webhooks for most CRM primary modules, such as Leads, Accounts, Contacts, Potentials (Opportunities), Events, and Tasks.

- Events: Record creation, update, deletion (subscribe using `.all`, `.create`, `.edit`, `.delete` suffixes per module).
- Supports field-level notification conditions to filter which field changes trigger notifications.
- Channel subscriptions expire and must be renewed periodically.
- Optionally return affected field values in the notification payload.

### Zoho CRM — Workflow Webhooks

Webhooks in Zoho CRM allow you to send real-time data from Zoho CRM to external applications or services when specific events occur such as record creation, update, or deletion.

- Configured per module (Leads, Contacts, etc.) and tied to workflow rules.
- You can associate up to 6 (1 Instant Action and 5 Time-Based Actions) webhooks per workflow rule.

### Zoho Desk — Webhook Subscriptions

These APIs help you programmatically create, view, update, or delete webhooks that subscribe to event information from Zoho Desk.

- **Ticket events**: Add, update, delete, attachment update. Supports department ID filtering and field-level tracking (up to 5 fields).
- **Contact events**: Add, update.
- **Account events**: Add, update.
- **Task events**: Add, update, delete.
- **Call events**: Add, update, delete. Supports department ID filtering.
- **Event events**: Add, update, delete.
- **IM events**: Message add, session status, message status.
- **Department events**: Add, update.
- Optionally include previous state of resource in update payloads.
