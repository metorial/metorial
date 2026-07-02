Let me fetch the full API documentation to get more details on the webhooks and goal/datapoint features.# Slates Specification for Beeminder

## Overview

Beeminder is a goal-tracking service that uses financial commitment to enforce accountability. Users define goals with target values and rates, track progress via datapoints plotted on a graph with a "Bright Red Line," and are charged real money if they go off track (derail). It integrates with numerous third-party services for automatic data collection.

## Authentication

Beeminder supports two authentication methods:

### 1. Personal Auth Token

For personal use, users can obtain their auth token by visiting `https://www.beeminder.com/api/v1/auth_token.json` after logging in. The token is then appended to every API request as a GET or POST parameter named `auth_token`.

Example: `https://www.beeminder.com/api/v1/users/alice/goals/weight.json?auth_token=abc123`

**Important:** The parameter name must be `auth_token` — a common mistake is to use `access_token` instead.

### 2. OAuth 2 (Client OAuth)

For applications accessing the API on behalf of users, Beeminder implements the OAuth provider protocol.

Steps:

1. Register your app at `beeminder.com/apps/new`. Application name and redirect URL are required. The redirect URL is where the user is sent after authorizing your app.
2. Redirect users to the authorization URL: `https://www.beeminder.com/apps/authorize` with parameters:
   - `client_id`: Your app's client ID (found at `beeminder.com/apps`)
   - `redirect_uri`: Must match the registered redirect URL
   - `response_type`: Always set to `token`
3. After authorization, the user is redirected to your `redirect_uri` with `access_token` and `username` as query parameters.
4. Include the access token via query parameter `access_token` or the `Authorization: Bearer <token>` header.

You can use `me` in place of the username in any endpoint to refer to the authenticated user.

Optionally, you can register a **Post De-Authorization Callback URL** to receive a POST when a user revokes your app, and an **Autofetch Callback URL** to receive a POST when Beeminder needs fresh data from your integration (e.g., before sending alerts or on manual refresh).

The base URL for all API requests is `https://www.beeminder.com/api/v1/`.

## Features

### User Information

Retrieve user profile data including timezone, list of goals, and account status. A `diff_since` parameter allows efficient polling by only returning goals and datapoints updated since a given timestamp, and an `updated_at` field lets you skip unnecessary requests if nothing has changed.

### Goal Management

Create, read, update, and archive goals. Goals support a variety of operations including creation, updates, fetching autodata, modifying the bright red line, managing pledges, and instant derailing. Key capabilities:

- **Goal types:** Do More, Do Less, Weight Loss, Gain Weight, Inbox Fewer, Odometer, and Custom.
- **Configuration:** Set target values, target dates, rates, units, deadlines, visibility (public/secret), tags, and graph display options (cumulative, moving average, aura, etc.).
- **Road (Bright Red Line) management:** Modify the goal's commitment trajectory via the `roadall` parameter, subject to the one-week akrasia horizon (changes can't make goals easier within one week).
- **Pledge management:** Short-circuit (instantly derail and charge), step down pledge level (subject to akrasia horizon), or cancel a scheduled step-down.
- **Ratchet:** Reduce safety buffer to increase pressure on a goal. For Do More goals, specify target days of buffer; for Do Less goals, specify the hard cap value.
- **Uncle (instant derail):** Immediately derail a goal in beemergency status, pay the pledge, and begin post-derail respite.
- **Refresh:** Force a refetch of autodata for goals connected to automatic data sources.

### Datapoint Management

Programmatic adding of data points is the primary use case, but the API supports most of everything else you can do from the website. Capabilities include:

- Create single or multiple datapoints with a timestamp (or daystamp), value, and optional comment.
- Update and delete existing datapoints.
- A `requestid` parameter can uniquely identify a datapoint, enabling idempotent upserts — clients can safely resend datapoints without creating duplicates.

### Charges

Create a charge of a given amount (minimum $1.00 USD) against a user, with an optional note. A `dryrun` parameter allows testing without actually creating the charge.

### URL-Based Goal Creation

Pre-fill and auto-advance the goal creation wizard by constructing URLs with query parameters (goal type, units, daily rate, goal name, leeway, pledge cap, etc.). Useful for external apps or bookmarklets to streamline goal setup without API calls.

## Events

You can configure Beeminder to remind you about goals that are about to derail via webhook, either on the individual goal settings page or on your account defaults page.

### Goal Derail Reminders

Beeminder will send a POST request to the URL you specify with a JSON body containing all goal attributes when a goal is about to derail. The webhook URL is configured per-goal via the `callback_url` attribute. Note that if different apps change this value, they will overwrite each other.

### Autofetch Callback

When an app registers an `autofetch_callback_url` and a goal uses that app as its data source, Beeminder will POST to the callback URL (with `username` and `slug` parameters) when it needs new data — for example, when the user manually refreshes or before sending derail alerts. This is an app-level callback, not a per-goal webhook.
