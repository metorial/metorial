Now I have enough information to write the specification. Let me compile it.

# Slates Specification for Bubble

## Overview

Bubble is a no-code platform that allows users to build web applications with a visual editor, including database management, user authentication, and workflow automation. It exposes a RESTful API consisting of a Data API for CRUD operations on application data and a Workflow API for triggering server-side workflows. Each Bubble application has its own API, so the base URL is specific to the application (e.g., `https://appname.bubbleapps.io/api/1.1/`).

## Authentication

Bubble uses bearer token authentication for its API. There are three authentication modes:

### 1. Admin API Token (Full Access)

- Navigate to Settings → API in the Bubble editor and generate a new API token.
- When you authenticate with such an API Token, the call is run in the context of an admin user of the app, who has access to all data.
- An admin token is valid until it is revoked.
- Include the token in the `Authorization` header as: `Authorization: Bearer <token>`

### 2. User Token (Scoped Access)

- If you log a user in with an action in an API Workflow, Bubble will respond with a token that can be used to authenticate the client in subsequent requests.
- Obtain a user token by calling a login or signup API workflow endpoint, which returns a `token`, `user_id`, and `expires` value.
- If you set "Keep the user logged in" to "yes", the token has a validity of 1 month. If you set it to "no", the token has a validity of 24 hours.
- Privacy rules will apply to this user as they would if the user was logging in the Bubble app.
- Include the token in the `Authorization` header as: `Authorization: Bearer <token>`

### 3. No Authentication

- In some cases, you may want to enable calls that aren't authenticated. To enable this, check the box "This workflow can be run without authentication" at the workflow level. When a workflow is run under such circumstances, the privacy rules that apply are the ones for 'everyone.'

### Prerequisites

- The Data API is disabled by default. To enable it, go to Settings → API and check the box "This app exposes a Data API". This allows you to select one-by-one which data types are exposed in the Data API.
- The Workflow API must also be enabled under Settings → API.
- The base URL follows the pattern: `https://appname.bubbleapps.io/api/1.1/` or `https://yourdomain.com/api/1.1/` if using a custom domain.

## Features

### Data Management (Data API)

The Data API allows other systems to search for, read, create, modify and delete data in your application's database via a RESTful interface.

- Operates on data types (tables) that the app owner has explicitly exposed via Settings → API.
- Access to data is controlled by the privacy rules applied to that particular data type.
- Supports searching/filtering records by field values, geographic coordinates, date ranges, and other field types.
- Each data type is exposed at its own endpoint: `/obj/{data_type_name}`.

### Workflow Execution (Workflow API)

The Workflow API lets you set up server-side workflows that can be scheduled in your app or triggered from an external application.

- API workflows are server-side workflows that you can schedule/trigger in your application and/or expose to be triggered from an external application or system through an API request.
- By making an API request to the server, you can create things, sign users up and send emails – anything you can do with a regular workflow.
- Workflows can accept custom parameters defined by the app builder.
- Sometimes you'll want your app to return data after a workflow has been triggered. You can use the Return data from API feature for this.
- Workflow endpoints follow the pattern: `/wf/{workflow_name}`.
- Each workflow can be individually configured for authentication requirements (admin-only, user token, or no authentication).

### User Authentication Management

- External systems can sign up and log in users through API workflows.
- Using a Sign up or Log the user in action in your workflow generates a response that includes a user_id, token, and expires value. These facilitate the authentication of ensuing calls as the user who has just registered or logged in.

### API Specification (Swagger/OpenAPI)

- The Swagger file is generated automatically by Bubble and is dynamic in that it will update according to your app's settings. The Swagger file is disabled by default but you can enable it under Settings → API. Available at `/api/1.1/meta/swagger.json`.

## Events

Bubble supports receiving webhooks from external services and has internal database trigger events, but does not provide an outbound webhook subscription system where external consumers register to receive event notifications about changes in a Bubble app.

### Incoming Webhooks (Receiving Events)

Whenever an event occurs in an external app and the application sends an HTTP request to your app, this is often described as a webhook. This allows you to start a process in your application, such as sending a welcome email or adding the user to a newsletter list.

- Bubble can receive webhooks from any external service via its Workflow API endpoints.
- These are configured as API Workflows exposed as public endpoints.
- Not a built-in event subscription system; rather, external services must be configured to POST to Bubble's workflow URLs.

### Database Trigger Events (Internal Only)

Database trigger events are a type of backend event that trigger whenever some specific data in the database changes. Whenever something is created, changed or deleted, the event will trigger.

- These are internal server-side events and are not exposed externally. They cannot be subscribed to by external systems.
- Database trigger events execute server-side when a specific change happens in the database, regardless of how the change was made.

**Note:** Bubble does not offer a native outbound webhook or event subscription mechanism for external systems to listen to changes. To notify external systems of changes, app builders must explicitly configure outgoing API calls within their workflows.
