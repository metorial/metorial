# Slates Specification for Emailable

## Overview

Emailable is an email verification service that checks whether email addresses are valid, deliverable, and safe to send to. It offers single and batch email verification via API, returning details such as deliverability state, risk score, and metadata about the email address.

## Authentication

Emailable supports two authentication methods:

### 1. API Key Authentication

Emailable expects the API key to be included in all API requests as a URL parameter (`api_key`), as POST data, or via an HTTP Authorization header using the Bearer scheme (e.g., `Authorization: Bearer your_api_key`).

There are two types of API keys:

- **Private API Keys**: Meant for server-side use. Should never be exposed publicly. Can optionally be restricted to a list of trusted IP addresses. Can access all API endpoints.
- **Public API Keys**: Meant for client-side use where the key is publicly exposed (e.g., JavaScript on a website). Requires a list of trusted domains to be configured. Limited to the `/verify` endpoint only.

Both key types can be created as either **live** or **test** keys. Test keys (prefixed with `test_`) do not consume credits and return simulated responses, useful for testing API integration.

API keys are created and managed in the Emailable Dashboard.

### 2. OAuth 2.0 (Authorization Code Flow)

Emailable supports OAuth 2.0 for authenticating users of OAuth Apps you've created. This allows making API requests on behalf of authenticated users.

- **Authorization endpoint**: `GET https://api.emailable.com/oauth/authorize`
- **Token endpoint**: `POST https://api.emailable.com/oauth/token`
- **Revoke endpoint**: `POST https://app.emailable.com/oauth/revoke`

The flow requires a `client_id`, `client_secret`, and `redirect_uri` configured in your OAuth App. Access tokens expire (default 86400 seconds) and can be refreshed using the provided refresh token. Scopes are not currently implemented; all tokens receive `all` scope.

Once an access token is obtained, it can be passed as an `access_token` URL parameter or via the `Authorization: Bearer` header.

## Features

### Single Email Verification

Verify an individual email address in real time. Returns the deliverability state (e.g., `deliverable`, `undeliverable`, `risky`, `unknown`) along with rich metadata including:

- Whether the address is disposable, free, or a role-based address (e.g., `support@`)
- A suggested correction for misspelled addresses (`did_you_mean`)
- Name and gender inference from the email address
- The SMTP provider and MX record of the domain
- A deliverability score (0–100)
- Whether the mail server is catch-all (accept-all)

**Key options:**

- `smtp`: Can be disabled to speed up verification at the cost of accuracy.
- `accept_all`: Enable accept-all detection (increases response time).
- `timeout`: Set a custom timeout (2–10 seconds).

### Batch Email Verification

Verify a list of emails in bulk by submitting a batch. Up to 50,000 emails can be submitted per batch.

- Results can be retrieved by polling the batch status endpoint or by providing a callback URL that receives results via HTTP POST upon completion.
- For batches up to 1,000 emails, individual results are returned inline. For larger batches, a downloadable CSV file is provided.
- Partial results can be requested while a batch is still processing (for batches up to 1,000 emails).
- The `response_fields` parameter allows limiting which fields are returned.
- Results include aggregate counts by state and reason.
- Individual results for small batches are retained for 30 days; download links for large batches are available for 5 days.

### Account Information

Retrieve basic account details including the account owner's email and the number of available verification credits.

### Embeddable Widget

A client-side JavaScript widget that automatically verifies email inputs on web forms. It can be configured with:

- Allowed email states, and whether to accept free, role, or disposable emails.
- Custom verification timeout and typing delay.
- Custom messages for various verification outcomes.
- Input selectors and form/input ignore lists.
- JavaScript event listeners for verification completion and errors.

## Events

Emailable supports a **batch completion callback**. When creating a batch, you can optionally provide a callback URL that Emailable will POST to when the batch is complete. The POST body contains the full batch results in JSON format, identical to the batch status endpoint response. If the callback endpoint does not return an HTTP 200 status, Emailable retries hourly for up to 3 days.

Beyond batch completion callbacks, Emailable does not support general-purpose webhooks or event subscriptions.
