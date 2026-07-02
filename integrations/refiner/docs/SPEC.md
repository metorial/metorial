Now let me get more details on webhook trigger events:Now let me check the specific webhook trigger events available:Now I have enough information to write the specification. The Salesforce integration page revealed the webhook trigger events: "Survey completed", "User enters segment", and "Tag added". Combined with the other sources mentioning "Saw Survey" and "Dismissed Survey", I can compile a complete picture.

# Slates Specification for Refiner

## Overview

Refiner is a customer feedback survey platform for web and mobile applications. It enables creating and deploying in-app surveys (NPS, CSAT, CES, etc.), managing user contacts and segments, and syncing survey response data with third-party tools. The platform provides a REST API for accessing survey data, managing contacts, and importing user traits.

## Authentication

Refiner uses API keys to allow access to the API. You can obtain your personal API key in your Refiner dashboard under "Integrations > Rest API".

Your API key can be provided in three different ways. The recommended authentication method is to provide your API key as a Bearer token, using the `Authorization: Bearer YOUR_API_KEY` header. Alternatively, you can also provide your API key as a request parameter (e.g., `?api_key=YOUR_API_KEY`).

The API base URL is `https://api.refiner.io/v1/`.

## Features

### Contact Management

Fetch all data on record for a specific contact in your Refiner project. To identify the contact, you need to provide the ID which was used when the contact was created, which is usually the user ID you also use in other tools and databases. Alternatively you can also identify the user with their email address. You can list all contacts, get a specific contact's details (including attributes, segments, and account association), and delete contacts.

- Deleting a user will also remove their survey responses. If you want to delete a user for compliance reasons but want to keep their survey responses, consider overwriting sensitive user data with empty values.

### User Identification and Trait Import

You can use the API to access survey data that you collected with Refiner. The API can also be used to import additional user data from your backend database into your Refiner account. The identify-user endpoint creates or updates a user record with custom traits (attributes).

- Any user data you send will be attached to the user record as a trait. The trait is identified by the attribute slug and data type (string, date or number). If a trait does not exist in your Refiner account yet, it will be created on the fly.
- You can provide a nested account object to group users together. Refiner stores users as two separate objects, a contact and an account. Both objects are automatically created when you identify a new user.

### Event Tracking

This endpoint provides a simple way to track user events. To track a user event, you need to provide the ID of your user and a name for the event that occurred. Event data tracked through this backend call will be merged with event data provided by the JavaScript client library.

- Event tracking is available in the Growth and Enterprise pricing plans. The Essentials plan does not support user event tracking.

### Survey Responses

Retrieve all survey views and responses. Included in the response is the response data itself, information about the survey, and basic information about the contact who responded. Responses can be filtered by survey, contact, date range, and completion status.

- You can also store a survey response for a user. It allows you to store historical survey data, or use your own UI for surveying your users.

### Response Tagging

You can add tags to survey responses to categorize and organize them for analysis.

### Segment Management

This endpoint allows you to add and remove users to a manual segment in Refiner. You can identify the user either with an id or their email. If no user matches the provided id or email, a new user is created.

### Survey Listing

Retrieve a list of all surveys in your Refiner project, including their UUIDs and names.

### Account Information

This endpoint returns information about your Refiner account, such as your current subscription usage and the environments you've created.

## Events

Refiner supports webhooks that send HTTP POST requests to a configured URL when specific trigger events occur.

Refiner allows you to create multiple webhooks, each with their own configuration. This allows you to send survey data to different endpoints simultaneously. You can also choose to include a secret token to validate and authorize incoming webhooks.

### Survey Interaction Events

Webhooks can be triggered on survey interactions including:

- **Survey Completed** — Fired when a user completes a survey. Includes the full survey response data.
- **Saw Survey** — Fired when a survey is shown to a user.
- **Dismissed Survey** — Fired when a user dismisses a survey.

Webhooks are sent as HTTP POST requests and their payload provides a comprehensive set of user data including the project UUID, the triggering event, generic user data such as their ID, email address, timestamps, and the segments they belong to.

### Segment Entry Events

When a user enters a segment, Refiner will trigger integrations (e.g. Slack alerts, Webhooks, etc.) that have the segment listed as a trigger event.

- You can configure which specific segments should trigger the webhook.
- Integrations won't be triggered when you just created or updated a segment and Refiner bulk checks all your users.

### Tag Added Events

Webhooks can be triggered when a tag is added to a survey response. This is useful for routing tagged responses to external systems for follow-up actions.
