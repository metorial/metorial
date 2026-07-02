Now let me get more details on the Tally.so API endpoints and features:Now I have a comprehensive picture. Let me compile the specification. Note: The search results reveal there are multiple products called "Tally" — Tally.so (form builder), Tally.xyz (DAO governance), and Tallyfy (workflow). Given the context of "Slates" as an integration platform, and the most commonly referred-to "Tally" in integration contexts being **Tally.so** (the form builder), I'll write the spec for Tally.so.

# Slates Specification for Tally

## Overview

Tally (tally.so) is an online form builder that lets users create forms, surveys, and quizzes using a document-style editor. It supports a wide range of input types including text, file uploads, signatures, payments (via Stripe), and conditional logic. The API allows programmatic management of forms, submissions, workspaces, organizations, and webhooks.

## Authentication

Tally supports two authentication methods:

### 1. Personal API Key (Bearer Token)

Users can generate a personal API key by navigating to **Settings > API keys** in the Tally dashboard and clicking "Create API key." Fine-grained permissions are not currently available — the key inherits the full permissions of the user who created it.

Include the API key as a Bearer token in the `Authorization` header of every request:

```
Authorization: Bearer tly-xxxx
```

**Base URL:** `https://api.tally.so`

### 2. OAuth 2.0 (Authorization Code Flow)

For third-party applications building public integrations, Tally supports OAuth 2.0. The flow works as follows:

- **Authorization URL:** `https://tally.so/oauth/authorize`
- **Token URL:** `https://tally.so/oauth/token`
- **Required parameters:**
  - `client_id` — Obtained by registering your application with Tally
  - `client_secret` — Obtained alongside the client ID
  - `redirect_uri` — Your application's callback URL
  - `response_type=code` — For the authorization request
  - `grant_type=authorization_code` — When exchanging the code for a token

Refresh tokens are supported via `grant_type=refresh_token` to obtain new access tokens.

Access tokens are then used as Bearer tokens in the `Authorization` header, the same way as API keys.

There is no documented set of granular OAuth scopes — the token provides access based on the authorizing user's permissions.

## Features

### Form Management

Developers can programmatically create forms, update input blocks, delete or fetch submissions and more. Forms are composed of blocks (e.g., `FORM_TITLE`, input fields, layout blocks) each identified by a UUID. Forms can be created in `PUBLISHED` or draft status. You can list all forms in your account, fetch a specific form's details, update its blocks and settings, or delete it.

- Forms support a wide variety of block types: text inputs, numbers, emails, phone numbers, dates, times, textareas, multiple choice, dropdowns, checkboxes, linear scales, file uploads, hidden fields, calculated fields, ratings, multi-select, matrix, ranking, signatures, and payments.
- Form settings such as status (open/closed) can be managed via the API.

### Submission Management

You can retrieve a specific form submission with all its responses and the form questions. Submissions can be listed (with filtering), fetched individually, or deleted. Each submission includes the respondent ID, form field answers, and metadata such as creation date.

### Form Questions

You can list the questions (input blocks) defined on a form, which is useful for understanding the form's structure before processing submissions.

### Workspace Management

Workspaces allow grouping related forms. The API supports creating, listing, fetching, updating, and deleting workspaces.

### Organization Management

You can list and remove users from your organization, as well as create, list, and cancel invitations to join the organization.

### User Info

You can fetch information about the currently authenticated user.

### Webhook Management

Webhooks can be created, listed, updated, and deleted via the API. You can create a new webhook for a form to receive form events. Each webhook is configured with a target URL, event types, and an optional signing secret. You can also list webhook delivery events and retry failed deliveries through the API.

## Events

Tally supports webhooks that push data to a specified HTTP endpoint in real time when events occur on a form.

### Form Response

The event trigger is a new form submission. When someone submits a Tally form, a notification containing the response data gets sent to your URL in JSON format via a POST request. The `FORM_RESPONSE` event type is currently the only supported webhook event type.

- The webhook payload includes: submission ID, respondent ID, form ID, form name, submission timestamp, and all field answers with their types and values.
- Tally can sign each webhook request with a SHA256 signature so you can verify that the payload really came from Tally before you process it. A signing secret can be configured when creating the webhook.
- Custom HTTP headers can be added to webhook requests.
- You can connect unlimited webhook URLs and pause them by clicking the toggle.
- Webhooks can be managed both through the Tally dashboard UI and programmatically via the API.
