Now let me check for webhooks/events and get more details on the API features:# Slates Specification for Exist

## Overview

Exist (exist.io) is a personal analytics platform that aggregates data from various services and manual tracking to help users understand patterns in their behaviour. It combines data from services users already use to help understand what makes them more happy, productive, and active. It delivers daily insights, tracks long-term trends and averages, and uncovers relationships (correlations) between different data points.

## Authentication

Exist supports two authentication methods:

### 1. Simple Token Authentication (Read-Only)

Simple token authentication is read-only and exists as a basic means for users to access their own data from Exist. To obtain a token, exchange a username and password via a POST request to:

- **Endpoint:** `POST https://exist.io/api/2/auth/simple-token/`
- **Parameters:** `username`, `password`
- **Response:** A JSON object containing a `token` field.

This token will not change or expire by design but may be deprecated in the future.

Include the token in all requests as: `Authorization: Token [your_token]`

### 2. OAuth2 (Read and Write)

OAuth2 is required for writing data to attributes and for multi-user applications. You must first create an OAuth2 client from your [app management page](https://exist.io/account/apps/) in Exist.

**Authorization Flow:**

1. Redirect the user to `https://exist.io/oauth2/authorize` with parameters: `response_type=code`, `client_id`, `redirect_uri` (must be HTTPS), and `scope`.
2. User approves the requested scopes.
3. Exist redirects back to your `redirect_uri` with a `code` parameter.
4. Exchange the code for tokens via `POST https://exist.io/oauth2/access_token` with parameters: `grant_type=authorization_code`, `code`, `client_id`, `client_secret`, `redirect_uri`.
5. Receive a JSON response with `access_token`, `refresh_token`, `token_type`, `scope`, and `expires_in`.

Sign all authenticated requests by adding the Authorization header, `Authorization: Bearer [access_token]`.

**Token Refresh:** Tokens expire in one year. Refresh by posting to `https://exist.io/oauth2/access_token` with `grant_type=refresh_token`, `refresh_token`, `client_id`, and `client_secret`.

**Scopes:** Scopes are organized by data group, each with read and write variants:

| Group         | Read Scope          | Write Scope          |
| ------------- | ------------------- | -------------------- |
| Activity      | `activity_read`     | `activity_write`     |
| Productivity  | `productivity_read` | `productivity_write` |
| Mood          | `mood_read`         | `mood_write`         |
| Sleep         | `sleep_read`        | `sleep_write`        |
| Workouts      | `workouts_read`     | `workouts_write`     |
| Events        | `events_read`       | `events_write`       |
| Finance       | `finance_read`      | `finance_write`      |
| Food & Drink  | `food_read`         | `food_write`         |
| Health & Body | `health_read`       | `health_write`       |
| Location      | `location_read`     | `location_write`     |
| Media         | `media_read`        | `media_write`        |
| Social        | `social_read`       | `social_write`       |
| Weather       | `weather_read`      | `weather_write`      |
| Symptoms      | `symptoms_read`     | `symptoms_write`     |
| Medication    | `medication_read`   | `medication_write`   |
| Custom Tags   | `custom_read`       | `custom_write`       |
| Manual        | `manual_read`       | `manual_write`       |

## Features

### User Profile

Retrieve the authenticated user's personal details including username, timezone, and unit preferences (imperial/metric).

### Attribute Management

Attributes are the core data points in Exist. An attribute can only be owned by one service at a time, and only the owning service can write data for it. The API allows you to:

- **Read attributes and their values:** Retrieve all attributes or specific ones, with current and historical daily values. Attributes belong to groups (activity, sleep, mood, productivity, etc.) and hold typed values (integer, float, string).
- **Acquire and release ownership:** Claim ownership of existing or templated attributes to write data to them, and release them when no longer needed.
- **Create custom attributes:** If you want something not in Exist's list of templates, you can create a new attribute by specifying its label, data type, and group.
- **Update values:** Set absolute values for an attribute on a given date.
- **Increment values:** Instead of sending a total, you can send incremental values to the increment endpoint, useful for event-driven tracking where Exist tallies the total.

### Correlations

Correlations describe a relationship between two different attributes and how they go together. An example might be "You have a better day when you walk more." Correlations get generated weekly based on up to a year of past data. You can retrieve all correlations or look up a specific pair of attributes. Results include correlation strength, confidence (p-value/stars), and human-readable descriptions.

### Insights

Insights are interesting events found within the user's data, generated automatically if the user's data fits an insight type's criteria. Typically these include day-level events (e.g., yesterday was the highest steps value in X days) and week/month-level summaries.

### Averages

Retrieve the most recent average values for each attribute, one set per week. Can also be used to retrieve historical averages. Averages include an overall value and per-day-of-week breakdowns (Monday through Sunday).

## Events

The provider does not support events. Exist does not offer webhooks or any purpose-built event subscription mechanism through its API.
