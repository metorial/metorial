Let me get more details on the authentication and Knack Flows feature.Now I have enough information to write a comprehensive specification.

# Slates Specification for Knack

## Overview

Knack is a no-code platform for building custom online databases and web applications. It provides a REST API for programmatic access to application data, including creating, reading, updating, and deleting records stored in user-defined objects (tables). Knack also offers a built-in automation engine called Flows for connecting with external services.

## Authentication

Knack supports two authentication methods, both using HTTP headers passed with every request:

### 1. Object-Based Authentication (API Key)

Object-based requests require at least two headers: an application ID — to identify the app whose records you are requesting — and an API key (which is specific to each app) to authenticate the request.

Required headers:

- `X-Knack-Application-Id`: Your application's unique ID.
- `X-Knack-REST-API-Key`: Your app-specific API key.

Both your Knack Application ID and API Key are available in your Builder's settings, found by clicking the gear icon in the upper-left corner, then navigating to API & Code.

This method provides full access to all fields and records across all objects in the application. It is strongly recommended to not use object-based requests from any client-side code, as this will expose your API key.

### 2. View-Based Authentication (User Token)

View-based requests require at least two headers: an application ID, and the value of `knack` for the API key header; note that you should not include your actual API key in view-based requests. To authenticate requests to views on pages protected by logins, you will need to use the Authorization header whose value should be a user token.

Required headers:

- `X-Knack-Application-Id`: Your application's unique ID.
- `X-Knack-REST-API-Key`: Set to the literal string `knack` (not your actual API key).
- `Authorization`: A user token (required for login-protected views).

View-based requests are scoped to a specific scene (page) and view, and respect the permissions and field visibility configured in that view. The URL format is: `https://api.knack.com/v1/pages/{scene_key}/views/{view_key}/records`.

The base URL for the API is `https://api.knack.com/v1`.

## Features

### Record Management (CRUD)

The API is used to make requests to create, retrieve, update, or delete records that are stored in your Knack apps. Requests are made for records from either a specific object in your app or a specific view on one of your pages.

- **Object-based requests** provide full access to all fields and records across any object.
- **View-based requests** respect the permissions and field configuration of a specific view, making them suitable for client-side use.
- Records are referenced by object keys (e.g., `object_1`) and field keys (e.g., `field_1`).

### Filtering and Sorting

You can sort records by appending `sort_field` (the field key) and `sort_order` (`asc` or `desc`) parameters. Filters can be applied using a JSON structure with match rules (`and`/`or`) specifying field, operator, and value conditions.

### File and Image Uploads

File uploads use a two-step process: the first step performs an HTTP POST with `multipart/form-data` content type to upload the asset (file or image), returning an asset ID. The second step attaches that asset ID to a record by creating or updating it.

### Application Metadata

You can fetch your app's metadata at `https://api.knack.com/v1/applications/{app_id}`. This provides information about the app's objects, fields, views, and scenes, which is useful for dynamically discovering the app's data structure.

### User Authentication (Remote Login)

Knack provides a remote login method to perform a remote login to obtain a user token to authenticate view-based API calls. This allows server-side code to authenticate as a specific user and interact with login-protected views.

## Events

There is no official public documentation or access to webhooks in the Knack API. Webhooks seem to exist internally for Knack, but are only accessible to certain integration platforms like Zapier and Integromat (now Make).

Currently, only Zapier and Integromat have access to documentation/instructions on how to utilize the `/hooks` API to set up webhooks sent on record creation/update/delete.

Through these third-party integration platforms, the following event types are available:

- **Record Created** — Triggers when a new record is created in a live app.
- **Record Updated** — Triggers when an existing record is updated in a live app.
- **Record Deleted** — Triggers when an existing record is deleted in a live app.
- **Form Submitted** — Triggers when a form is submitted in a live app.

Each event is scoped to a specific object. The webhook endpoint (`/hooks`) is not publicly documented, so direct webhook registration outside of supported third-party platforms (Zapier, Make) is not officially supported.
