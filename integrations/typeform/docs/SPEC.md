Let me get the specific scopes list from Typeform's documentation.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Typeform

## Overview

Typeform is an online form and survey builder that creates conversational, one-question-at-a-time forms. It provides APIs to programmatically create and manage forms, retrieve responses, manage workspaces and themes, and receive real-time submissions via webhooks.

## Authentication

Typeform supports two authentication methods. Both require passing a Bearer token in the `Authorization` header of every request.

### 1. Personal Access Token

To use the Typeform Create, Responses, and Webhooks APIs, you need to pass your personal access token in the Authorization header of your requests.

To generate a personal access token:

1. Log in to your Typeform account, go to Account > Personal tokens, click "Generate a new token", name it, choose the needed scopes, and click "Generate token".

The token format looks like: `tfp_943af478d3ff3d4d760020c11af102b79c440513`

Usage: `Authorization: Bearer {your_access_token}`

### 2. OAuth 2.0 (Authorization Code Grant)

For building applications that act on behalf of Typeform users.

**Registration:**
Log in to Typeform, go to Developer Apps under your organization, click "Register a new app", fill in the app name, website URL, and redirect URI(s), then register. The client_secret is shown only once after registration — store it safely. The client_id is visible in the Developer Apps panel.

**Endpoints:**

- Authorization: `GET https://api.typeform.com/oauth/authorize`
- Token exchange: `POST https://api.typeform.com/oauth/token`

**Flow:**
The first request confirms the client_id, prompts the user to grant permissions, and returns a temporary authorization code. The second request confirms the authorization code and returns the access token.

Access tokens expire after 1 week. To obtain long-lived access, request the `offline` scope during authorization to receive a refresh token, which can be used to obtain new access tokens without user interaction.

**Available Scopes:**

- `accounts:read` — Read basic account information
- `forms:read` / `forms:write` — Read/manage forms
- `images:read` / `images:write` — Read/manage images
- `themes:read` / `themes:write` — Read/manage themes
- `responses:read` / `responses:write` — Read/delete form responses
- `webhooks:read` / `webhooks:write` — Read/manage webhooks
- `workspaces:read` / `workspaces:write` — Read/manage workspaces
- `offline` — Required to receive a refresh token

**Base URL:** `https://api.typeform.com/`
If the account is configured for the EU Data Center, use `https://api.eu.typeform.com` or `https://api.typeform.eu`.

## Features

### Form Management

Create, retrieve, update, and delete forms, images, and themes. Combine these to build new typeforms and customize them with images, videos, and themes — all without using the Typeform UI. Forms support various field types including short text, long text, email, date, multiple choice, rating, opinion scale, file upload, number, website URL, and payment fields. Forms can use Logic Jumps to create conditional branching, Hidden Fields to pass contextual data via URL parameters, and custom thank-you screens.

- Custom form messages can be updated (e.g., button labels, validation messages).
- Hidden Fields is a PRO account feature.

### Form Translations

Forms can be translated into multiple languages. The API supports retrieving translation statuses, fetching translation payloads, updating translations, deleting translations for specific languages, and auto-translating forms.

### Response Retrieval

Send a GET request to retrieve submission data for a typeform. The response includes historical submissions in JSON format. Responses can be filtered by date range (`since`/`until`), and specific fields. Responses can also be deleted (supports GDPR Right To Be Forgotten).

### File and Media Downloads

Retrieve files uploaded by respondents for a specific form or individual response. Audio and video master files can also be requested for generation and then downloaded.

### Image Management

Upload, retrieve, and delete images associated with your Typeform account. Images are uploaded in base64 format. Images can be retrieved in various sizes optimized for backgrounds, choice images, or standard display.

### Theme Management

Create, retrieve, update, and delete visual themes that control the appearance of forms (colors, fonts, backgrounds, button styles). Themes can be applied to forms to maintain consistent branding.

### Workspace Management

Workspaces is a RESTful API to manage where typeforms are stored. Use it to add and delete workspaces, give team members access (and revoke access), and move typeforms between workspaces.

- PRO+ account holders can invite anyone with a Typeform account to collaborate in shared workspaces.
- Workspaces can also be managed at the account/organization level.

### Account Information

Retrieve basic account information such as alias, email, and language for the authenticated user.

### Form Insights

Retrieve form-level and individual question-level insights for a given form.

## Events

Typeform supports webhooks that can be configured per form.

### Form Response Submitted

The primary webhook event is a new response submission. When a new submission comes in, a notification containing the response data is immediately sent to the configured destination URL. The webhook payload includes the full response data: form definition, answers, hidden fields, calculated scores, variables, and payment information (if applicable).

- Webhooks are configured per form using a unique tag name.
- Payloads can be signed with HMAC SHA256 using a shared secret for verification.
- SSL certificate verification can be enabled or disabled.
- Multiple webhooks can be attached to a single form.

### Partial Response

Webhooks can be triggered upon a full form submission or a partial response. The `form_response_partial` event type can be subscribed to when creating a webhook, enabling notifications when respondents partially complete a form without finishing it.

- Event types are configured via the `event_types` object when creating/updating a webhook (e.g., `{"form_response_partial": true}`).
