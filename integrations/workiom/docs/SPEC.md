# Slates Specification for Workiom

## Overview

Workiom is a no-code cloud platform that allows teams to build custom business applications (such as CRMs, task management, and ticketing systems) to manage data, workflows, and collaboration. With the API, you can create, read, update, and delete records, manage lists, and automate tasks within your Workiom apps.

## Authentication

Workiom supports two authentication methods:

### API Key Authentication (Recommended)

All APIs in Workiom require an API Key passed in the header. You can grab your API Key from Account Settings, then pass it through the header using the name `X-Api-Key`.

Example:

```
curl -X GET "https://api.workiom.com/api/services/app/Apps/GetAll" \
  -H "accept: text/plain" \
  -H "X-Api-Key: {Your API Key}"
```

### Bearer Token Authentication

You can also obtain an authentication token by using the API's `api/TokenAuth/Authenticate` endpoint. This endpoint accepts user credentials (username/password) and returns a bearer token. The token is then passed via the `Authorization: Bearer {token}` header.

The authentication token allows access to all Workiom apps the user has permissions on. The token expires after 10 hours of generating it.

**Base URL:** `https://api.workiom.com`

## Features

### App Management

Retrieve all apps in your Workiom workspace. Apps are the top-level containers that hold lists (tables) and their associated data.

### List (Table) Metadata

Most actions on a list require getting the list's metadata first. The metadata response contains useful information like the list's fields and views along with their IDs. You can expand the metadata to include fields, views, and filters. Each field has a data type (Text, Number, DateTime, Boolean, StaticSelect, LinkList, User, Website, Email, File, Rollup, PhoneNumber, Count, Currency, AutoNumber, CheckList).

### Record Management (CRUD)

- **Query Records:** You can specify a listId to get its records, with sorting options, pagination, or pass an array of filter objects for granular control over what records you get.
- **Create Records:** Create new records in a list by providing a JSON object where keys are field IDs and values are the record data, formatted according to each field's data type.
- **Update Records:** If you do not wish to send the whole record with every update, you can use the UpdatePartial endpoint, which allows you to send only the changed fields. A standard full-update endpoint is also available.
- **Delete Records:** Remove records from a list.

Field values must match their data type. For example, linked list fields expect an array of objects with `_id` and `label`, static select fields expect an object with `id` and `label`, and user fields expect an object with `id` and `username`.

### File Management

To attach a file to a record you need to upload the file to the server, then get the file ID and use it in the desired API. Files are uploaded via the `/File/Upload` endpoint.

### Webhook Subscription Management

You can programmatically create, list, update, and delete webhook subscriptions via the API. Each subscription is scoped to a specific app and list.

## Events

Workiom can send and receive webhooks in real time, trigger actions, update, or delete records automatically.

Webhook subscriptions are configured per list within an app. Each subscription requires an app ID, list ID, a target URL, and an event type.

### Record Created

Fires when a new record is added to a specified list. Set `eventType: 0` for when a record is created.

### Record Updated

Fires when an existing record in a specified list is modified. Set `eventType: 1` for when a record is updated.

Each webhook subscription can be activated or deactivated via the `isActive` flag and is identified by a unique subscription ID for management purposes.
