Now let me get the full scopes list:# Slates Specification for Zoho Bigin

## Overview

Zoho Bigin is a lightweight CRM designed for small businesses, focused on pipeline-centric sales management. It provides access to CRM features, allowing you to manage contacts, deals, and tasks programmatically. Bigin has modules such as Contacts, Deals, Products, Activities, and so on.

## Authentication

Zoho Bigin exclusively uses **OAuth 2.0** for API authentication. Instead of a traditional username and password, the OAuth 2.0 protocol uses an access token with the API request to read, create, update, and delete data in the resource server. Bigin uses Authorization Code Grant Type for obtaining an access token.

### Setup

1. Register your application (client) with Bigin's Authorization server at the Zoho API Console. When you register, the authorization server assigns OAuth 2.0 client credentials — Client ID and Client Secret — which are essential in the OAuth 2.0 flow.

2. Construct the authorization URL:

   ```
   https://accounts.zoho.com/oauth/v2/auth?scope={scopes}&client_id={client_id}&response_type=code&access_type=offline&redirect_uri={redirect_uri}
   ```

3. Exchange the authorization code for tokens at:
   ```
   {accounts-server}/oauth/v2/token
   ```
   with `client_id`, `client_secret`, `code`, `redirect_uri`, and `grant_type=authorization_code`.

### Data Center URLs

You must use domain-specific accounts URLs to generate access and refresh tokens. Based on the domain location of the user:

| Region | Accounts URL                    | API Domain                    |
| ------ | ------------------------------- | ----------------------------- |
| US     | `https://accounts.zoho.com`     | `https://www.zohoapis.com`    |
| EU     | `https://accounts.zoho.eu`      | `https://www.zohoapis.eu`     |
| AU     | `https://accounts.zoho.com.au`  | `https://www.zohoapis.com.au` |
| IN     | `https://accounts.zoho.in`      | `https://www.zohoapis.in`     |
| CN     | `https://accounts.zoho.com.cn`  | `https://www.zohoapis.com.cn` |
| JP     | —                               | `https://www.zohoapis.jp`     |
| SA     | —                               | `https://www.zohoapis.sa`     |
| CA     | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca`     |

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
