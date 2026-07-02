Now let me get more details on the API features by looking at the credential and group objects.I now have enough information to write the specification.

# Slates Specification for Certifier

## Overview

Certifier is a SaaS platform for creating, issuing, and managing digital credentials such as certificates and badges. It provides tools for designing credential templates, bulk generation, distribution via email, recipient verification (including QR codes), and analytics tracking. Credentials are compliant with the OpenBadge 3.0 standard and can be shared on LinkedIn and social media.

## Authentication

Certifier uses **Bearer Token** authentication via access tokens.

- **Type:** Bearer Token
- **Token management:** Access tokens are created and managed in the Certifier Dashboard.
- **Header format:** Requests must include two headers:
  - `Authorization: Bearer <ACCESS_TOKEN>`
  - `Certifier-Version: 2022-10-26` (an API version date string)
- **Base URL:** `https://api.certifier.io/v1/`

There is no OAuth2 authorization flow for third-party apps; authentication is done solely via personal access tokens generated from the dashboard.

## Features

### Credential Management

Create, read, update, delete, and search credentials. Each credential belongs to a group and has a recipient (name and email), issue date, optional expiry date, standard attributes (e.g., recipient name), and custom attributes (user-defined key-value pairs configured in the account settings). Credentials go through a lifecycle: they start as `draft`, and can be `scheduled`, `issued`, or `expired`.

- **Issuing:** A draft credential can be issued, making it active and accessible in the recipient's digital wallet.
- **Sending:** An issued credential can be sent to the recipient via email.
- **Combined workflow:** A single API call can create, issue, and send a credential in one step, useful for automation upon course completion or event attendance.
- Custom attributes must be pre-created in the Certifier dashboard before use via the API.

### Credential Interactions

Track and record interactions with credentials. Interactions can be created and listed for a given credential, enabling engagement tracking such as views, downloads, or shares.

### Designs

Retrieve certificate and badge design templates. Designs are created in the Certifier dashboard using a visual builder; the API provides read-only access to list and fetch design details. Each credential group can be associated with specific designs for certificates and badges.

### Groups

Manage credential groups, which serve as organizational containers for credentials. Groups can be created, updated, deleted, listed, and fetched. Each group typically corresponds to a course, program, or event and is linked to one or more designs.

## Events

Certifier supports **webhooks** for real-time event notifications. Webhooks are configured and managed via the Certifier dashboard. Each webhook request is signed with an HMAC SHA256 signature (via `X-Webhook-Signature` header) using a webhook secret for verification.

### Credential Events

All available webhook events relate to credential lifecycle changes:

- **credential.created** – Fired when a new credential is created.
- **credential.updated** – Fired when an existing credential is modified.
- **credential.deleted** – Fired when a credential is deleted.
- **credential.issued** – Fired when a credential is issued (made active).

Webhook payloads are sent as POST requests with JSON bodies containing the event type and a reference to the affected resource. Failed deliveries are retried with exponential backoff up to 7 attempts over approximately 3.5 days.
