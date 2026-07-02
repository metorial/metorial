Let me get more details on the API reference page and check for webhook support.Now let me get more details on the webhooks reference and the OAuth token endpoint.Now I have enough information to write the specification.

# Slates Specification for Hotjar

## Overview

Hotjar is a behavior analytics and user feedback platform that provides heatmaps, session recordings, and surveys to help understand how users interact with websites. Its API allows programmatic access to survey response data and user data management (lookup and deletion) for privacy compliance. The API is available on Observe and Ask Scale plans only.

## Authentication

Hotjar uses a combination of API keys and the OAuth 2.0 client credentials flow for authentication. API keys are generated from within the Hotjar app and consist of a client ID and a client secret. To use the API, you must first send a request to the token endpoint with the client ID and client secret to obtain a bearer token.

**Steps to authenticate:**

1. Only users with Admin permissions in their Hotjar Organization can create API credentials. Navigate to Settings > API in the Hotjar app.
2. Select the Organization, enter a credential name, and select the scope (which limits the API feature access).
3. To obtain an access token, send an HTTP POST request to `https://api.hotjar.io/v1/oauth/token` with `Content-Type: application/x-www-form-urlencoded` and the following parameters: `grant_type=client_credentials`, `client_id`, and `client_secret`. The response includes an `access_token`, `token_type` (Bearer), and `expires_in` (3600 seconds).
4. Include the bearer token in subsequent API requests via the `Authorization: Bearer <token>` HTTP header. The API base URL is `api.hotjar.io`.

**Important considerations:**

- Hotjar API keys automatically expire after one year and cannot be extended. You must generate new credentials before expiration.
- Access tokens expire after 1 hour (3600 seconds) and must be refreshed by requesting a new token.
- Ask Scale customers can access Survey responses export, User lookup, and deletion request features. Observe Scale customers can access User lookup and deletion request features.

## Features

### Survey Response Export

The API lets you automatically export survey response data to your preferred analysis tool. You can list surveys for a site and retrieve their responses.

- Requires a `site_id`, which can be found in the Sites & Organizations page.
- An optional `with_questions` flag controls whether question information is included in the response.
- Responses are sorted by creation date in descending order. It is not currently possible to filter responses (e.g., by date).
- Available on Ask Scale plans only.

### User Lookup and Deletion

You can perform user lookup and deletion requests to automate GDPR and user privacy obligations.

- Lookup/deletion can be performed by providing the user's email address (`data_subject_email`) and/or a mapping of site IDs to user IDs (`data_subject_site_id_to_user_id_map`).
- A `delete_all_hits` boolean flag controls whether found data is immediately deleted.
- If `delete_all_hits` is false, an email with a data report link is sent to the data subject's email and the default recipient address, mimicking the web application's User Lookup tool behavior.
- Available on Observe and Ask Scale plans.

## Events

Hotjar supports webhooks for real-time event notifications.

### Survey Response

Hotjar sends HTTP POST requests to your webhook URL whenever a new survey response is created.

- The payload includes device type (tablet, mobile, or desktop), browser name, operating system, country code and name, Hotjar user ID, and creation timestamp.
- Available on Ask Scale plans.

### Recording

Hotjar sends HTTP POST requests to your webhook URL when a new recording that matches your recording segment is created.

- Webhooks are configured per recording segment.
- Available on Observe Scale plans.

### Webhook Security

- All payloads are signed using HMAC (sent via the `com-hotjar-signature` header) and include a timestamp to mitigate replay attacks.
- Event types include `survey_response`, `recording`, and `test_message`.
- If the webhook endpoint returns a 410 status code, Hotjar will delete the webhook. Failed deliveries are retried up to 6 times.
