# Zoho Bigin Integration Specification

## Overview

Zoho Bigin is a lightweight CRM designed for small businesses, focused on pipeline-centric sales management. It provides access to CRM features, allowing you to manage contacts, deals, and tasks programmatically. Bigin has modules such as Contacts, Deals, Products, Activities, and so on.

## Authentication

Zoho Bigin exclusively uses **OAuth 2.0** for API authentication. The integration exposes one OAuth method for a customer-owned regular regional or Multi-DC server application. `applicationType` is required. `region` is required for a regional application and optional for Multi-DC as an expected-region constraint.

### Setup

1. Register a regular regional or Multi-DC server application with Bigin's Authorization server at the Zoho API Console. Supply its Client ID and Client Secret when connecting; they are used unchanged.

2. Regional authorization starts at the selected regional Accounts origin. Multi-DC authorization starts at `https://accounts.zoho.com/oauth/v2/auth`.
3. The callback must include matching `location` and `accounts-server` values. Exchange the authorization code at `{accounts-server}/oauth/v2/token` only after validating that exact origin and its inferred region. Enforce the regional selection or optional Multi-DC expected-region constraint when supplied.
4. Refresh at the persisted regional Accounts origin and preserve the existing refresh token if Zoho omits a replacement. Bigin API requests use the allowlisted `api_domain` returned by the token response.

### Data Center URLs

The validated callback Accounts origin determines where authorization codes are exchanged and tokens are refreshed. Bigin API requests use the matching allowlisted API domain returned by Zoho:

| Region | Accounts URL                    | API Domain                    |
| ------ | ------------------------------- | ----------------------------- |
| US     | `https://accounts.zoho.com`     | `https://www.zohoapis.com`    |
| EU     | `https://accounts.zoho.eu`      | `https://www.zohoapis.eu`     |
| IN     | `https://accounts.zoho.in`      | `https://www.zohoapis.in`     |
| AU     | `https://accounts.zoho.com.au`  | `https://www.zohoapis.com.au` |
| JP     | `https://accounts.zoho.jp`      | `https://www.zohoapis.jp`     |
| CA     | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca`     |
| SA     | `https://accounts.zoho.sa`      | `https://www.zohoapis.sa`     |
Access tokens are passed in the header as: `Authorization: Zoho-oauthtoken {access_token}`

### Scopes

Scopes follow the format `ZohoBigin.{scope_name}.{operation_type}`. Operation types include: `ALL`, `READ`, `CREATE`, `WRITE`, `UPDATE`, `DELETE`.

Key scope categories:

| Scope Name                             | Description                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `ZohoBigin.modules.ALL`                | Full access to all module records (contacts, deals, companies, products, activities) |
| `ZohoBigin.modules.{module_name}.{op}` | Access to a specific module (e.g., `ZohoBigin.modules.contacts.READ`)                |
| `ZohoBigin.settings.ALL`               | Access to metadata: modules, fields, layouts, related lists, custom views, tags      |
| `ZohoBigin.users.ALL`                  | Manage users in the organization                                                     |
| `ZohoBigin.org.ALL`                    | View and manage organization details                                                 |
| `ZohoBigin.bulk.ALL`                   | Bulk read/write operations                                                           |
| `ZohoBigin.notifications.ALL`          | Manage webhook notification subscriptions                                            |

Scopes can be made more granular (e.g., `ZohoBigin.settings.fields.READ`, `ZohoBigin.settings.tags.CREATE`).

#### Declared Scope Contract

```ts
[
  'ZohoBigin.modules.ALL',
  'ZohoBigin.settings.ALL',
  'ZohoBigin.users.READ',
  'ZohoBigin.notifications.ALL',
  'ZohoSearch.securesearch.READ',
  'ZohoBigin.modules.contacts.READ',
  'ZohoBigin.modules.accounts.READ',
  'ZohoBigin.modules.pipelines.READ',
  'ZohoBigin.modules.products.READ',
  'ZohoBigin.modules.tasks.READ',
  'ZohoBigin.modules.events.READ',
  'ZohoBigin.modules.calls.READ'
]
```

| Capability group | Retained scope |
| --- | --- |
| Module-record and related-record CRUD, search, upsert, and notes | `ZohoBigin.modules.ALL` |
| Module/field/layout/custom-view metadata and tag definitions | `ZohoBigin.settings.ALL` |
| User discovery | `ZohoBigin.users.READ` |
| Notification subscription lifecycle | `ZohoBigin.notifications.ALL` |
| Search Records across Contacts, Accounts, Pipelines, Products, Tasks, Events, and Calls | `ZohoSearch.securesearch.READ` plus the corresponding seven `ZohoBigin.modules.<module>.READ` scopes |

The [Bigin scope catalog](https://www.bigin.com/developer/docs/apis/v2/scopes.html) documents modules.ALL and settings.ALL for ordinary module and metadata/tag operations. The [Search Records documentation](https://www.bigin.com/developer/docs/apis/v2/search-records.html) treats secure search and module access as independent requirements, so the search tool retains `ZohoSearch.securesearch.READ` and explicit READ scopes for every supported search module. Organization and bulk scopes are not requested because no current tool or trigger calls those APIs. Reauthorization and one representative call per retained group remain pending suitable regional OAuth credentials.

## Features

### Record Management

Create, read, update, delete, and search records across all Bigin modules. Supported modules include Accounts (companies in Bigin), contacts, deals, tasks, events, calls, products, and activities. Records can be filtered by custom views, sorted by fields, and queried with specific field selections. Supports upsert operations to insert or update records in a single call.

### Related Records

Manage relationships between records across modules. You can retrieve related records for a given record, update relationships, and delink (disassociate) related records.

### Notes and Attachments

Add, retrieve, update, and delete notes associated with records. Upload, download, and delete file attachments and photos on records.

### Tags

Create, update, and delete tags at the module level. Add tags to or remove tags from individual records. Retrieve record counts for specific tags.

### Search

Search for records within modules using criteria-based queries, phone numbers, email addresses, or keywords.

### Metadata and Settings

Fetch the metadata of modules, fields, layouts, custom views, and related lists. Retrieve organization details, user profiles, roles, and permissions. This is useful for dynamically building forms or understanding the data structure of a Bigin account.

### User Management

List, add, update, and delete users in the organization. View user profiles and roles.

### Bulk Operations

Bulk Read API allows you to fetch a large set of data from a Bigin account. This API is very useful whenever you require to export a large amount of data or to take a backup of your data without a big impact on your API limits. Bulk Write allows mass insert or update of records. Both operate asynchronously via job-based workflows.

## Events

Zoho Bigin supports webhook-based notifications through its Notifications API (also called "actions/watch").

### Module Record Notifications

Get real-time notifications via webhook for any specific updates made to Bigin modules. You subscribe to events by specifying a combination of module and operation.

- **Event format**: `{module_api_name}.{operation}` where operation can be `create`, `edit`, `delete`, or `all`.
- For example: `"Contacts.create"`, `"Accounts.edit"`, `"Pipelines.delete"`, `"Products.all"`.
- **Parameters**:
  - `notify_url`: URL to be notified (POST request). Whenever any action gets triggered, the notification will be sent through this notify url.
  - `channel_id`: A unique identifier for the notification channel, returned in the notification payload for correlation.
  - `token`: A verification string (max 50 characters) sent back in the notification body for validation.
  - `channel_expiry`: Set the expiry time for instant notifications. Maximum of only one day from the time they were enabled. If it is not specified or set for more than a day, the default expiry time is for one hour. Subscriptions must be periodically renewed.
- You can subscribe to multiple modules/operations per channel and manage (update, disable) subscriptions via the API.
