# Slates Specification for Fillout Forms

## Overview

Fillout is an online form builder for creating forms, surveys, and quizzes. Its API provides programmatic access to manage forms and their submissions, including support for scheduling, payments, and quiz scoring data. The platform also supports creating submissions programmatically and receiving real-time webhook notifications.

## Authentication

Fillout supports two authentication methods:

### API Key Authentication

To authenticate requests, provide your API key in the `Authorization` header in the format: `Authorization: Bearer <your-api-key>`. Replace `<your-api-key>` with the API key obtained from your Fillout account.

The API key can be generated and managed from the **Developer** settings tab in your Fillout account dashboard. You can revoke or regenerate your API key at any time.

The base API URL is typically `https://api.fillout.com`. If you're self-hosting Fillout or using the EU agent, a different URL will appear in the dashboard.

### OAuth 2.0 (for 3rd Party Integrations)

Fillout supports OAuth 2.0 for third-party applications that need to access user accounts.

1. **Authorization Request**: Redirect users to `GET https://build.fillout.com/authorize/oauth` with query parameters:
   - `client_id`: Your application's client ID
   - `redirect_uri`: The URL to redirect to after authorization
   - `state`: An optional string to retain state across the redirect

2. **Token Exchange**: After the user authorizes, exchange the received `code` for an access token by calling `POST https://server.fillout.com/public/oauth/accessToken` with:
   - `code`: The authorization code received
   - `client_id`: Your app's client ID
   - `client_secret`: Your app's client secret
   - `redirect_uri`: The redirect URI used in the authorization step

   The response includes an `access_token` and a `base_url` for API requests.

3. **Token Invalidation**: Revoke an access token via `DELETE https://server.fillout.com/public/oauth/invalidate`, authenticated with `Authentication: Bearer <your-api-key>` header.

To create an OAuth app, navigate to **Settings > Developer > OAuth integrations** in your Fillout dashboard, where you can configure redirect URIs, obtain your client ID, and generate a client secret.

## Features

### Form Management

Retrieve a list of all forms in your account and access detailed metadata for any specific form. Given the `formId`, returns all the questions in that form and other metadata, including question definitions (name, type, ID), calculations, URL parameters, scheduling fields, payment fields, and quiz configuration.

- Supports 50+ question types including Address, Checkbox, DatePicker, Dropdown, Email, FileUpload, MultipleChoice, ShortAnswer, and many more.

### Submission Management

Retrieve, create, and delete form submissions.

- **List submissions**: Fetch all submissions for a given form with filtering options including date range (`afterDate`, `beforeDate`), submission status (`finished` or `in_progress`), text search, and sort order.
- **Get individual submission**: Retrieve a specific submission by its ID.
- **Create submissions**: Programmatically create new submissions for a form.
- **Delete submissions**: Remove a specific submission by its ID.
- Submission data includes question responses, calculations, URL parameters, scheduling details, payment information (Stripe), and quiz scores.
- Supports retrieving partial/in-progress submissions and preview responses.
- Can include an edit link for submissions when requested.

## Events

Fillout supports webhooks for receiving real-time notifications about form activity.

### Form Submission

Once subscribed, your webhook will receive submissions in the same format as the entries in the responses list from the `/submissions` endpoint.

- Webhooks are created per form by providing a `formId` and a destination `url`.
- The webhook payload includes the full submission data (questions, answers, calculations, scheduling, payments, quiz scores, etc.).
- Webhooks can be created and removed programmatically via the API.
- Only the **new submission** event type is supported; there are no separate events for updates or deletions.
