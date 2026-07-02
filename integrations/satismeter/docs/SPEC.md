# Slates Specification for Satismeter

## Overview

SatisMeter is a customer feedback platform that collects satisfaction data through in-app, email, and mobile surveys. It supports survey templates including NPS, CSAT, CES, and custom micro surveys. Users can send custom traits (attributes) to SatisMeter, which are stored and used for survey targeting and response segmentation.

## Authentication

SatisMeter uses two authentication mechanisms depending on the API being used:

### API Key (Bearer Token)

SatisMeter API uses token-based authentication. In order to use the API, you need to authenticate requests using an API Key. You can manage your project's API Keys in your project's settings, by navigating to Settings > Integrations > API. Add an `Authorization` header to the request with the content `Bearer API_KEY`, replacing `API_KEY` with your API Key.

This method is used for the REST API v3 endpoints (responses, statistics, users, events).

When using this API you'll be querying data about a project or survey referencing it by its ID. Navigate to Settings > Integrations > API to find the Project ID and any survey's ID.

### Write Key

The Write Key is used to identify the project and authorize requests for inserting responses. It is found in SatisMeter > Settings > Integrations > API keys. This key is used specifically for the insert-response endpoint.

### Basic Auth (Legacy)

The unsubscribe email API uses basic auth (username, password) along with the Project ID. The API Key serves as the username with an empty password.

## Features

### Survey Response Export

SatisMeter uses a REST API to export a list of responses in either CSV or JSON format. Responses can be filtered by date range (startDate, endDate) and are scoped to a specific project and optionally a specific survey (campaign).

### Survey Response Statistics

You can get statistics calculated from responses recorded in a specific survey, identified by its ID. This provides aggregated dashboard-level metrics for a given project and campaign.

### User Management

Users can be created, updated, listed, and deleted via the API. User traits (properties/attributes like name, email, or custom fields) are stored in SatisMeter's record and help target surveys and segment/filter responses. Supported trait types include Text, Date, Number, and Yes/No (boolean).

### Event Tracking

The REST API allows you to track events by making an HTTP call. If there is a live survey configured to be triggered on a certain event, a call to that endpoint will make SatisMeter display the survey to the user. Events require a userId, event name, and project ID.

### Insert Survey Responses

You can use the API to post responses from your server. Each response is associated with a specific survey (campaign) and includes answers to survey questions. The delivery method can be specified as "In-App", "Mobile", or "Email". Anonymous responses are supported using an `anonymousId` field instead of `userId`.

### Email Unsubscribe Management

The API allows you to read and update the list of unsubscribed emails. You can retrieve the current unsubscribe list and add new emails to it for a given project.

## Events

SatisMeter supports webhooks for receiving real-time notifications about survey interactions.

### Survey Response Events

Webhooks can be configured in the Integrations section of SatisMeter settings. You just enter a URL of your web service and SatisMeter will send data to this URL.

A webhook can be configured to trigger on the following scenarios:

- **Answered** (`"event": "answered"`): Fires when a user rates on the 0-10 scale (i.e., answers the first question).
- **Completed** (`"event": "completed"`): Fires when a user fills in all survey questions (submits a full response).
- **Dismissed** (`"event": "dismissed"`): Fires when a user closes the survey without completing it.

The webhook payload includes the full response data: rating, feedback text, answers array, user information (name, email, userId, traits), location data, survey delivery method, response category (e.g., promoter/detractor), and timestamp.
