Let me get more details on the full API documentation, especially the webhook events and all available resources.# Slates Specification for Nusii proposals

## Overview

Nusii is an online proposal software for freelancers and agencies that enables creating, sending, tracking, and managing business proposals. It supports client management, reusable content templates, electronic signatures, multi-currency pricing, and proposal activity tracking.

## Authentication

Nusii supports two authentication methods:

### API Key (Token Authentication)

For direct integrations and personal use. An API key is included in the `Authorization` header of every request:

```
Authorization: Token token=YOUR_API_KEY
```

The API key can be obtained from **Settings > Integrations & API** in the Nusii dashboard. A `User-Agent` header identifying your application is also required.

### OAuth 2.0 (Authorization Code with PKCE)

For third-party integrations acting on behalf of other Nusii users. Nusii implements the Authorization Code grant with PKCE (Proof Key for Code Exchange).

**Setup:**

1. Register an OAuth application at **Settings > API** in Nusii.
2. Enter your app name, redirect URI(s), and choose scopes.
3. Store your **Client ID** and **Client Secret** (shown only once).

**Scopes:**

- `read` — Read-only access (GET requests).
- `write` — Write access (POST, PUT, DELETE). Must be combined with `read`.

**Endpoints:**

- Authorization: `GET https://app.nusii.com/oauth/authorize`
- Token exchange: `POST https://app.nusii.com/oauth/token`
- Token revocation: `POST https://app.nusii.com/oauth/revoke`

**Flow:**

1. Generate a PKCE code verifier and derive a SHA-256 code challenge.
2. Redirect the user to the authorization URL with `client_id`, `redirect_uri`, `response_type=code`, `scope`, `code_challenge`, and `code_challenge_method=S256`.
3. Exchange the returned authorization code for tokens by POSTing `grant_type=authorization_code`, the code, redirect URI, client ID, client secret, and code verifier to the token endpoint.

Access tokens expire after **24 hours** and can be refreshed using the refresh token. Authenticated API requests use a Bearer token:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

If the user belongs to multiple Nusii accounts, they will be asked to select which account to authorize during the OAuth flow.

## Features

### Client Management

Create, update, list, and delete clients. Client records include contact details (email, name, business, address, phone, website), preferred currency, locale/language, and PDF page size settings.

### Proposal Management

Create, update, list, archive, send, and delete proposals. Proposals can be filtered by status (`draft`, `pending`, `accepted`, `rejected`, `clarification`) and archived state. Proposals can be created from templates by specifying a `template_id`. Options include setting an expiration date, display date, theme, and toggling report mode or total exclusion.

### Sending Proposals

Send proposals to one or multiple recipients (up to 10) with configurable subject, message body, CC/BCC addresses, and sender identity. Each recipient can be marked as eligible to sign. Sending is subject to the account's active proposal plan limit.

### Sections

Manage proposal and template content sections. Sections can be of type `text` (content only) or `cost` (with line items and totals). Sections support positioning, reusability across proposals/templates, optional pricing (client-selectable packages), subtotals, and PDF page breaks.

### Line Items

Manage pricing line items within cost sections. Line items support three cost types: `fixed`, `recurring` (with intervals like monthly, yearly, hourly, etc.), and `per` (per unit/item/hour with quantity). Amounts are specified in cents.

### Templates

List and retrieve proposal templates, including public (shared) templates. Templates serve as blueprints whose sections are copied into new proposals.

### Proposal Activities

View the activity log for proposals, including events like client views, PDF downloads, proposal sends, status changes, acceptances, rejections, email bounces, and email opens. Activities can be filtered by proposal or client and include detailed metadata such as IP address and email delivery information.

### Account & Users

Retrieve account information (company details, default currency, locale, theme) and list all users on the account.

### Themes

List available proposal themes for visual customization.

## Events

Nusii supports webhooks that can be registered and managed via the API. You provide a target URL and select which events to subscribe to. Webhook payloads are sent as `POST` requests with JSON bodies containing the event name and the related object data.

### Proposal Events

- **proposal_created** — Triggered when a proposal is created.
- **proposal_updated** — Triggered when a proposal is updated.
- **proposal_destroyed** — Triggered when a proposal is deleted.
- **proposal_accepted** — Triggered when a client accepts a proposal.
- **proposal_rejected** — Triggered when a client rejects a proposal.
- **proposal_sent** — Triggered when a proposal is sent to a client.
- **proposal_activity_client_viewed_proposal** — Triggered when a client views a proposal.

### Client Events

- **client_created** — Triggered when a client is created.
- **client_updated** — Triggered when a client is updated.
- **client_destroyed** — Triggered when a client is deleted.

Webhook endpoints are configured by specifying a `target_url` and an array of `events` to subscribe to. Failed deliveries are retried up to 25 times. If the target URL responds with `410 GONE`, the webhook endpoint is automatically removed.
