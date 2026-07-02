Let me get more details on the full API features.# Slates Specification for Delighted

## Overview

Delighted is a customer experience (CX) platform that enables businesses to collect and analyze customer feedback through various survey types including NPS, CSAT, CES, and others. It provides a REST API for programmatically sending surveys, managing people, retrieving responses, and accessing metrics across multiple CX projects.

## Authentication

All API requests must be made over HTTPS and are authenticated via HTTP Basic Auth. Use your API key as the username and leave the password blank.

To use the Delighted API, you'll need a private API key that is linked to your account. Each CX project has its own API key, so ensure you've selected the correct project.

- **Method:** HTTP Basic Authentication
- **Base URL:** `https://api.delighted.com/v1/`
- **Username:** Your Delighted API key
- **Password:** Leave blank
- The API key can be found under Integrations > API in your Delighted account. Limited users cannot view the API key, and each project has its own key.

Example:

```
curl https://api.delighted.com/v1/metrics.json \
  -u YOUR_DELIGHTED_API_KEY:
```

## Features

### Survey Distribution

Send surveys to people via the API by creating person records with an email address or phone number. You can add custom properties (metadata) to each survey request for filtering responses on the dashboard, such as location, product purchased, or customer type. Surveys can be sent via email or SMS. You can create a person without scheduling a survey email by passing `send=false`, useful if you wish to handle surveying the person yourself and add your own survey response data via the API.

- Supports configurable delay before sending surveys.
- Supports locale settings for multilingual surveys.
- Depending on the survey throttling interval set on your account, a person added via the API may not be sent a survey if they have been sent one recently.

### Survey Response Management

List and retrieve survey responses, including scores, comments, tags, notes, and additional question answers. You can also programmatically add survey responses (e.g., for responses collected outside of Delighted).

- Responses include metadata such as person properties, timestamps, and permalinks.
- Supports filtering by date range and other parameters.

### Metrics Retrieval

Retrieve aggregated survey metrics such as NPS score, promoter/passive/detractor counts and percentages, and total response count. Useful for dashboard reporting and analytics.

### People Management

Manage survey recipients including listing all people, deleting people and their associated data, listing unsubscribed people, and listing bounced emails. People can be deleted by ID or email address. You can also programmatically unsubscribe people from future surveys.

### Autopilot Management

Autopilot is Delighted's recurring survey automation feature. The API allows you to:

- Retrieve the Autopilot configuration for email or SMS platforms (active status, frequency).
- Add people to Autopilot by providing their email address (for Email Autopilot) or phone number (for SMS Autopilot).
- List people currently enrolled in Autopilot.
- Remove people from Autopilot, which cancels their scheduled surveys.

### Pending Survey Request Management

Delete pending (not yet sent) survey requests for specific people, useful for cancelling surveys that are scheduled but have not been dispatched.

### Web Snippet

Delighted provides a web snippet for embedding in-app surveys, with presets configurable in the Delighted dashboard without needing to modify code. Configuration set in Delighted provides defaults that can be customized in the JavaScript call. Supports throttling, adaptive sampling, and multi-project setups.

## Events

Delighted supports webhooks to trigger requests to your own application when feedback and unsubscribe events occur. Webhooks are always sent as an HTTP POST request to the webhook URLs configured via the Webhooks integration.

Every webhook includes an `X-Delighted-Webhook-Signature` header that can be used to verify the request authenticity. The signature is an HMAC SHA-256 digest generated using your private API key over the request body.

### Survey Response Events

The response webhook is triggered when a response is received or updated. This means the response webhook fires when a score is selected, when a comment is added, and when any Additional Questions are answered in a Delighted CX survey.

- Event type: `survey_response.updated`
- Payload includes person details, survey type, score, comment, tags, notes, person properties, and additional question answers.
- Webhook rules can be configured to filter by conditions (e.g., "promoters only").

### Unsubscribe Events

The unsubscribe webhook is triggered when someone clicks on the unsubscribe button within the survey email.

- Event type: `survey_response.unsubscribed`
- Payload includes details about the person who unsubscribed.
