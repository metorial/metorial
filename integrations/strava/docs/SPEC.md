Now let me get the full list of OAuth scopes from the authentication docs.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Strava

## Overview

Strava is a fitness tracking platform for athletes that records and analyzes activities such as running, cycling, swimming, and many other sport types. The Strava REST API includes data on athletes, segments, routes, clubs, and gear. The Strava V3 API is a publicly available interface that allows developers to access Strava data.

## Authentication

Strava uses OAuth2 for authentication to the V3 API.

**Registration**: Go to https://www.strava.com/settings/api and create an app. Upon creating your application, you'll be given a Client ID, Client Secret, Access Token, and Refresh Token which are all used in authorization.

**Authorization Flow**:

1. To initiate the flow, applications must redirect the user to Strava's authorization page. The authorization endpoint is different for mobile and web applications. Redirect the user to `GET https://www.strava.com/oauth/authorize`.
2. If access is accepted, code and scope parameters will be included in the query string. The code parameter contains the authorization code required to complete the authentication process. Code is short lived and can only be used once. The application must now call the `POST https://www.strava.com/oauth/token` with its client ID and client secret to exchange the authorization code for a refresh token and short-lived access token.

**Access Tokens**: Access tokens expire every six hours. Applications use unexpired access tokens to make resource requests to the Strava API on the user's behalf. Access tokens are required for all resource requests, and can be included by specifying the `Authorization: Bearer #{access_token}` header.

**Token Refresh**: Refresh expired tokens by calling `POST https://www.strava.com/oauth/token` with `grant_type=refresh_token` and the current refresh token.

**Deauthorization**: Revoke access via `POST https://www.strava.com/oauth/deauthorize` with the access token.

**Scopes** (comma-delimited in the authorization URL):

| Scope               | Description                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `read`              | Read public segments, public routes, public profile data, public posts, public events, club feeds, and leaderboards |
| `read_all`          | Read private routes, private segments, and private events for the user                                              |
| `profile:read_all`  | Read all profile information even if the user has set their profile visibility to Followers or Only You             |
| `profile:write`     | Update the user's weight and FTP, and star/unstar segments on their behalf                                          |
| `activity:read`     | Read activity data for activities visible to Everyone and Followers, excluding privacy zone data                    |
| `activity:read_all` | Same as `activity:read`, plus privacy zone data and access to Only You activities                                   |
| `activity:write`    | Create manual activities and uploads, edit activities visible to the app                                            |

## Features

### Athlete Profile Management

Retrieve the authenticated athlete's profile including personal details, stats, and zones (heart rate and power zones). Update the athlete's weight. Requires `profile:read_all` for full profile details and `profile:write` for updates.

### Activity Management

Create, read, and update athletic activities. Activities include detailed metrics such as distance, duration, elevation, speed, heart rate, power, and cadence. Activities can be created manually or via file upload. You can also retrieve comments, kudos, and laps for a given activity.

- Supports many sport types (Run, Ride, Swim, MountainBikeRide, etc.).
- Activities have privacy settings (Everyone, Followers, Only You) that affect API visibility based on the granted scopes.
- Segment and segment leaderboard data is available to all applications.

### Activity Uploads

Upload activity files in formats such as FIT, TCX, and GPX. Uploads are processed asynchronously; you receive an upload ID to check processing status. Requires `activity:write` scope.

### Activity Streams

Streams is the Strava term for the raw data associated with an activity. All streams for a given activity or segment effort will be the same length and the values at a given index correspond to the same time. Streams are available in 11 different types. Stream types include time, distance, latlng, altitude, heartrate, cadence, watts, temperature, and more.

### Segments and Segment Efforts

Segments are user-defined portions of road or trail where athletes can compare performance. You can explore segments in a given area, retrieve segment details and leaderboards, and star/unstar segments. Segment efforts represent an athlete's attempt on a segment, with detailed performance data.

- Segment explore allows searching by bounding box and activity type.
- Leaderboards can be filtered by gender, age group, and weight class.

### Routes

Routes are manually-created paths made up of sections called legs. Currently it is only possible to create routes using the Routebuilder web interface. The API allows reading route details, listing an athlete's routes, and exporting routes as GPX or TCX. Route streams (lat/lng, distance, altitude) are also available.

### Clubs

Clubs represent groups of athletes on Strava. You can retrieve club details, list club members, list club activities, and view club admins. The API also supports joining/leaving clubs and managing club membership (approve, decline, promote, revoke admin).

### Gear

Retrieve details about an athlete's gear (shoes, bikes, etc.) including brand, model, and distance tracked. Gear is associated with activities.

### Athlete Statistics

Retrieve aggregate statistics for the authenticated athlete, including totals and recent activity summaries across different sport types (ride, run, swim).

## Events

Webhooks enable applications to receive real-time updates for supported objects, eliminating the need for polling. The Strava Webhook Events API supports webhook events for certain changes to athlete and activity objects.

Each application may only have one subscription, but that single subscription will allow the application to receive webhook events for all supported changes to data owned by athletes that have authorized that application.

Subscriptions are created via `POST https://www.strava.com/api/v3/push_subscriptions` using the app's `client_id`, `client_secret`, a `callback_url`, and a `verify_token`. Strava validates the callback URL with a challenge-response handshake before activating the subscription.

### Activity Events

Webhook events are pushed when an activity is created, updated, or deleted. Update events are triggered when the activity's title, type, or privacy setting changes.

- The webhook payload contains `object_type`, `object_id`, `aspect_type` (create/update/delete), `owner_id`, and an `updates` hash with changed fields.
- The webhook data doesn't actually contain any activity data, just an object_id. You must use the API to fetch full activity details.
- Applications that have `activity:read` scope and not `activity:read_all` scope will receive a delete event when an activity's visibility is changed from Followers Only or Everyone to Only You.

### Athlete Deauthorization Events

A webhook event is pushed when an athlete revokes access to your application. The event includes `object_type: "athlete"` and an `updates` hash containing `"authorized": "false"`.

- Per the API terms, you need to implement webhooks to know when an athlete has deauthorized your API application.
