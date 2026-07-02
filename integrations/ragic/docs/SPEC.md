# Slates Specification for Ragic

## Overview

Ragic is an online no-code database builder that lets users create business applications using a spreadsheet-like interface. It is an online database builder for creating real-world business applications using a simple Excel-like interface. The Ragic REST API allows you to query any data that you have on Ragic, or to execute create / update / delete operations programmatically to integrate with your own applications.

## Authentication

Ragic supports two authentication methods:

### 1. API Key (Recommended)

You authenticate to the Ragic API by providing one of your API keys in the request. Authentication occurs via HTTP Basic Auth. Provide your API key as the basic auth username. You do not need to provide a password.

The API key can be passed in two ways:

- As an `Authorization` header with the value `Basic YOUR_API_KEY`
- As a query parameter: `APIKey=YOUR_API_KEY`

When the SYSAdmin integrates an API requiring access with your account permissions, your API Key is needed. In Profile, you can generate the API Key for the current user. Regenerating it will reset the previous key.

Because when your code accesses Ragic via an API key, it will basically log in as the user of the API key and execute read/write as this user. We highly recommend creating a separate user for API key access. This way the API access will not be mixed with an organizational user.

All API requests must be made over HTTPS. Calls made over plain HTTP will fail. You must authenticate for all requests.

**Required inputs:**

- **API Key**: Generated from Personal Settings > Profile in Ragic.
- **Server URL / Domain**: The base URL depends on where your account resides (e.g., `www.ragic.com`, `na3.ragic.com`, `ap5.ragic.com`, `eu2.ragic.com`, `ap12.ragic.com`). It is required to modify www to na3, ap5, or eu2 in the API URL based on your Ragic database account URL.
- **Account Name / Database**: The account identifier in the URL path (e.g., `demo` in `https://www.ragic.com/demo/sales/1`).

### 2. Password Authentication (Session-based)

Please only use this when you cannot authenticate with HTTP Basic Authentication. You send a request for a session ID with a valid email and password.

Send a request to `https://{server}.ragic.com/AUTH` with parameters `u` (email), `p` (password), and `login_type=sessionId`. To use the returned sessionId in future requests to remain authenticated, include the sessionId in the URL parameter as `sid=`.

This authentication method is session based, and session is server dependent. You may need to modify the URL based on the location of the account you wish to access. For example, `https://ap8.ragic.com/AUTH` for accounts that reside on server `https://ap8.ragic.com`.

## Features

### Record Management (CRUD)

Create, read, update, and delete entries (records) in any Ragic sheet/form. Each sheet is identified by its account name, tab folder, and sheet index in the URL path. Records are referenced by their record ID.

- **Reading**: Query records with filter conditions, full-text search, sorting, and field name options. Data is returned in JSON format.
- **Creating**: Create new entries by POSTing field values to a sheet endpoint.
- **Updating**: Modify existing entries by POSTing updated field values with a specific record ID.
- **Deleting**: Remove entries by sending a DELETE request with the record ID.
- Parameters such as triggering server-side workflows (e.g., Link and Load, action buttons) can be included with create/update operations.

### File and Image Management

Retrieving uploaded files, images and email attachments is supported, as well as uploading files and images to records.

### Record Export

Retrieve HTML, PDF, Excel, Mail Merge and Custom Print Report of a record through the API.

### Record Comments

Add comments to records via the API.

### Record Locking

Lock and unlock records to prevent concurrent modifications.

### Action Button Execution

Trigger pre-configured action buttons on records programmatically via the API.

### Import from URL

Import data into Ragic sheets from an external URL.

### Filtering and Search

Query records with various filter conditions, full-text search (`fts` parameter), sorting, and ordering. Field names can be returned either as field IDs or human-readable names.

## Events

Ragic supports webhooks to notify external systems about data changes on a per-sheet basis.

### Record Changes

You can find webhook for a sheet on Ragic by clicking on the Tools button at the top. You will find the webhook in the Sync section. Click on the "webhook" feature and enter the URL that should receive this notification, and you're done. You can also opt in to receive full information on the modified data by checking the checkbox "send full content on changed record".

You can choose the types of events you want to trigger the webhook. We provide the following options: Trigger on new entry, Trigger on entry update, Trigger on entry deletion.

- **Event types**: Create, Update, Delete (individually selectable per webhook).
- **Payload options**: Minimal (list of changed record IDs) or full content (complete record data with account name, path, sheet index, and event type).
- **Signature verification**: Webhooks configured with "Send full content of changed record" will include a signature in the request. After receiving the webhook, you can use the public key provided to verify the signature. If verification fails, it means the request may have been tampered with.
- Webhooks are configured per sheet, not globally. Each sheet can have its own webhook URL and event type configuration.
