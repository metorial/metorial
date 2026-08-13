# Zoho Integration Specification

## Overview

Zoho is an Indian multinational technology company offering a suite of over 55 cloud-based software products covering CRM, accounting, HR, project management, helpdesk, email, marketing, analytics, and more. Zoho has over 45 integrated applications, mainly designed for small and medium-sized businesses (SMBs), but scalable for larger enterprises, spanning categories including customer relationship management, marketing, sales, customer support, finance, human resources, collaboration, productivity, operations, IT management, and analytics. All Zoho products share a unified authentication system through Zoho Accounts.

## Authentication

Zoho uses **OAuth 2.0** as its authentication protocol across all products. OAuth 2.0 allows you to grant a third-party application delegated access to the protected resources of Zoho via Zoho APIs.

### Registration

To access the resources of Zoho using the various Zoho APIs, you will need to register your application with Zoho first. On successful registration, you will get a Client ID and Client secret, which you can use to get the access token needed to make API calls.

Register a server-based regular regional or Multi-DC application at the **Zoho API Console**: `https://api-console.zoho.com/`. Supply that application's Client ID and Client Secret when connecting; the integration uses them unchanged.

Client types supported:

- **Server-based Applications**: Web apps running on a dedicated HTTP server (standard for integrations).
- **Client-based Applications**: Browser-only apps independent of a web server.
- **Mobile Applications**: Apps installed on smartphones and tablets.
- **Non-browser Mobile Applications**: Devices without browser provisioning (smart TVs, printers).
- **Self Client**: Stand-alone applications that perform only back-end jobs (without any manual intervention) like data sync.

### OAuth 2.0 Flow (Authorization Code Grant)

Zoho uses the **authorization code grant type**. The flow is:

1. **Application Selection**: Require `applicationType` as either `regional` or `multi_dc`; there is no default. A regional application also requires the region where it is registered. A Multi-DC application may omit `region`, or provide one as an expected-region constraint.

2. **Authorization Request**: Start a regional application at its selected regional Accounts origin. Start a Multi-DC application at the global Accounts origin:

   ```
   https://accounts.zoho.com/oauth/v2/auth?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&scope={scope}&access_type=offline
   ```

3. **Validate Callback Routing**: Treat `location` and `accounts-server` as optional routing hints. Validate every supplied value against the exact supported regions and Accounts origins, and require them to agree when both are present. Without either hint, use the selected region for a regional application; for a regionless Multi-DC application, try token exchange only at the integration's fixed supported Accounts origins until Zoho accepts the code. Multi-DC discovery requires shared OAuth credentials across the enabled data centers.

4. **Exchange Code for Tokens**: POST to the resolved regional Accounts origin, for example:

   ```
   https://accounts.zoho.eu/oauth/v2/token
   ```

   With parameters: `client_id`, `client_secret`, `grant_type=authorization_code`, `code`, `redirect_uri`.

   Validate the returned `api_domain` against the resolved callback region before saving it. Persist the application type, inferred/resolved region, Accounts origin, API domain, and token state. Generic APIs such as CRM and Books use this validated origin rather than reconstructing one from the region.

5. **Use Access Token**: Most APIs in this combined package pass the access token with Zoho's `Zoho-oauthtoken` scheme. Zoho Projects V3 instead documents the standard `Bearer` scheme.

   ```
   Authorization: Zoho-oauthtoken {access_token}
   Authorization: Bearer {access_token} // Projects V3
   ```

6. **Refresh Token**: Access tokens are valid for only 1 hour. Refresh through the persisted regional Accounts origin and preserve the existing refresh token when Zoho omits a replacement. Set `access_type=offline` in the authorization request to receive the initial refresh token.

### Scopes

Scope limits the level of access the application can have. For example, if the client only needs to access the Invoices module in Zoho Books, that can be defined in the scope. The resource server will provide access only to that module. It can also be defined what kind of operations (create/read/update/delete) are permissible.

Scope format: `ServiceName.ScopeName.OperationType`

- **ServiceName**: The Zoho product (e.g., `ZohoCRM`, `ZohoBooks`, `ZohoDesk`, `ZohoPeople`, `ZohoProjects`, `ZohoMail`, etc.)
- **ScopeName**: The module within the service (e.g., `modules`, `contacts`, `users`, `settings`)
- **OperationType**: Can be ALL, READ, UPDATE, DELETE (ALL gives access to perform all operations).

Examples: `ZohoCRM.modules.leads.READ`, `ZohoBooks.purchaseorders.UPDATE`, `ZohoCRM.settings.ALL`

Multiple scopes should be separated by commas.

#### Declared Scope Contract

```ts
[
  'ZohoCRM.modules.ALL',
  'ZohoCRM.settings.ALL',
  'ZohoCRM.notifications.ALL',
  'ZohoCRM.coql.READ',
  'ZohoSearch.securesearch.READ',
  'ZohoCRM.users.READ',
  'Desk.tickets.ALL',
  'Desk.contacts.ALL',
  'Desk.basic.READ',
  'Desk.search.READ',
  'ZohoBooks.fullaccess.all',
  'ZohoBooks.invoices.ALL',
  'ZohoBooks.contacts.ALL',
  'ZohoBooks.expenses.ALL',
  'ZohoBooks.settings.READ',
  'ZOHOPEOPLE.forms.ALL',
  'ZOHOPEOPLE.attendance.READ',
  'ZOHOPEOPLE.leave.READ',
  'ZohoProjects.portals.READ',
  'ZohoProjects.projects.ALL',
  'ZohoProjects.tasks.ALL',
  'ZohoProjects.milestones.READ',
  'AaaServer.profile.READ'
]
```

| Capability group | Retained scope |
| --- | --- |
| CRM record CRUD, metadata, notification subscriptions, COQL, secure search, and user discovery | `ZohoCRM.modules.ALL`, `ZohoCRM.settings.ALL`, `ZohoCRM.notifications.ALL`, `ZohoCRM.coql.READ`, `ZohoSearch.securesearch.READ`, `ZohoCRM.users.READ` |
| Desk ticket/contact CRUD, department discovery, and search | `Desk.tickets.ALL`, `Desk.contacts.ALL`, `Desk.basic.READ`, `Desk.search.READ` |
| Books organizations, invoices, contacts, and expenses | `ZohoBooks.settings.READ`, `ZohoBooks.invoices.ALL`, `ZohoBooks.contacts.ALL`, `ZohoBooks.expenses.ALL`; `ZohoBooks.fullaccess.all` retained pending coverage verification |
| People form CRUD plus attendance and leave reads | `ZOHOPEOPLE.forms.ALL`, `ZOHOPEOPLE.attendance.READ`, `ZOHOPEOPLE.leave.READ` |
| Projects portal/milestone reads plus project/task CRUD | `ZohoProjects.portals.READ`, `ZohoProjects.milestones.READ`, `ZohoProjects.projects.ALL`, `ZohoProjects.tasks.ALL` |
| Authenticated-user profile | `AaaServer.profile.READ` |

Coverage is based on the current [CRM scope catalog](https://www.zoho.com/crm/developer/docs/api/v8/scopes.html), [Desk API scope catalog](https://support.zoho.com/DeskAPIDocument), [Books OAuth catalog](https://www.zoho.com/books/api/v3/oauth/), [People scope catalog](https://www.zoho.com/people/api/scopes.html), and [Projects milestone scope documentation](https://www.zoho.com/projects/help/rest-api/milestones-api.html).

Desk.contacts.ALL is retained pending live verification because current Desk documentation is inconsistent about the broad contact-scope spelling. The Books documentation does not prove that `ZohoBooks.fullaccess.all` supersedes the resource namespaces, so the granular scopes used by current tools remain and only the redundant invoices READ scope is removed. The full-access scope and the newly added Projects milestone read scope require reauthorization and representative endpoint checks. Those checks are blocked until Task 0 provides working credentials.

### Data Centers

Data protection and privacy laws in multiple countries state that user data can only be stored in data centers located on that country's soil. In compliance, Zoho has set up data centers in multiple countries. Each data center only holds the data of users who have registered at that domain.

The integration advertises one `oauth` method for the exact subset below. Accounts origins are callback and refresh allowlist entries. API origins are the only accepted `api_domain` values for generic product calls:

| Region       | Accounts URL             | API Domain            |
| ------------ | ------------------------ | --------------------- |
| US           | `accounts.zoho.com`      | `www.zohoapis.com`    |
| EU           | `accounts.zoho.eu`       | `www.zohoapis.eu`     |
| India        | `accounts.zoho.in`       | `www.zohoapis.in`     |
| Australia    | `accounts.zoho.com.au`   | `www.zohoapis.com.au` |
| Japan        | `accounts.zoho.jp`       | `www.zohoapis.jp`     |
| Canada       | `accounts.zohocloud.ca`  | `www.zohoapis.ca`     |
| Saudi Arabia | `accounts.zoho.sa`       | `www.zohoapis.sa`     |
| UK           | `accounts.zoho.uk`       | `www.zohoapis.uk`     |

Regular regional authorization starts at the selected regional Accounts origin. Multi-DC authorization starts at `https://accounts.zoho.com`; its callback infers the actual region unless the user supplied an expected-region constraint. Code exchange and refresh use the exact validated callback Accounts origin. Desk and People use explicit regional service-origin maps because they do not share the generic API origin.

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
- Projects calls use V3 through an explicit regional Projects host selected from the validated auth region. Published Projects V3 hosts cover US, EU, IN, AU, JP, and CA; Projects calls fail closed in SA and UK while the other Zoho APIs remain available there. Project and task status mutations require V3 status IDs. Owner inputs require ZPUIDs rather than V2 user IDs or ZUIDs. The legacy project `template` list filter and milestone `completed`/`notcompleted` filters are unsupported because no documented V3 mapping exists. See [Projects V3 Migration](./PROJECTS_V3_MIGRATION.md) for endpoint mappings, compatibility adapters, and the live release gate.

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
