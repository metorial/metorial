Let me get the specific event types and OAuth scopes list.Now let me get the OAuth scopes details.Now I have all the information needed. Let me compose the specification.

# Slates Specification for HelloSign

## Overview

HelloSign (now Dropbox Sign) is an electronic signature platform that provides APIs for sending documents for signature, managing templates, and embedding signing experiences into applications. It supports both email-based and embedded (iframe) signing workflows, with legally binding eSignatures that are SOC2 and HIPAA compliant.

## Authentication

HelloSign supports two authentication methods:

### 1. API Key (HTTP Basic Auth)

You can authenticate with the Dropbox Sign API using an API key. The API key is passed as the username in HTTP Basic Authentication, with an empty password.

Example:

```
curl 'https://api.hellosign.com/v3/account' -u 'YOUR_API_KEY:'
```

API keys are long-lived and do not expire. Each Dropbox Sign account may have up to four API keys at a time.

### 2. OAuth 2.0 (Authorization Code Flow)

Dropbox Sign uses OAuth 2.0 so that users can securely grant access to apps built with the Dropbox Sign API.

- **Authorization URL:** `https://app.hellosign.com/oauth/authorize`
- **Token URL:** `https://api.hellosign.com/v3/oauth/token`
- **Refresh Token URL:** `https://api.hellosign.com/v3/oauth/token?refresh`
- Requires a `client_id` and `client_secret` obtained by creating an API App in HelloSign settings.
- Access tokens are only valid for a given period of time (typically one hour). You can use the refresh_token to generate a new access_token for a user that has previously authorized your app without prompting them to complete another OAuth flow.
- Access token is passed via the `Authorization: Bearer <access_token>` header.
- Dropbox Sign requires production approval for apps using OAuth. That means your app can't be authorized or added by other users until it is approved for production.

**OAuth Scopes (Charge Me / App Owner billed):**

| Scope                | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `basic_account_info` | Access basic account information (email, name).              |
| `request_signature`  | Send signature requests, access statuses and document files. |

**OAuth Scopes (Charge Users / User billed):**

| Scope                      | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `account_access`           | Access basic account information.                         |
| `signature_request_access` | Send, view, update signature requests and download files. |
| `template_access`          | View, create, and modify templates.                       |
| `team_access`              | View and modify team settings and members.                |
| `api_app_access`           | View, create, and modify embedded API apps.               |

## Features

### Signature Requests

Send documents for electronic signature via email or embedded flows. Supports uploading files (PDF and others), specifying multiple signers with ordering, adding CC recipients, setting subject/message, attaching metadata, and configuring signer authentication (access codes, SMS PIN). Documents can include form fields positioned via coordinates or text tags.

### Embedded Signing

In embedded signing flows, Dropbox Sign provides the eSign technology via API, but the signing experience is embedded into your app or website via an iFrame. Users sign and complete documents without ever leaving your surface. Requires a `client_id` from an API App and the hellosign-embedded client-side library.

### Templates

Create reusable templates with preloaded data from your systems to make the automatic signature process faster. Templates support merge fields, signer roles, and CC roles. Signature requests can be sent from templates with pre-filled data. Templates can also be created and edited via an embedded iframe in your application.

### Embedded Requesting

Allow users to create and send signature requests from within your application using an embedded UI, without redirecting to HelloSign's website.

### Bulk Send

Send a single template-based signature request to multiple signers at once via a bulk send job. Useful for scenarios like sending the same agreement to a list of recipients.

### Unclaimed Drafts

Create signature request drafts that can be claimed and completed by a user. This is useful for creating requests on behalf of others or for embedded requesting flows.

### Team Management

Create and manage teams, add or remove team members, and update team settings. Team members can share templates and collaborate on signature workflows.

### Account Management

Create, retrieve, and update account settings, including configuring the account callback URL for receiving webhook events.

### API App Management

Create and manage API Apps, which represent your integration with HelloSign. Each app has its own client ID, callback URL, domain whitelist, branding options (custom logo), and optional OAuth configuration.

### Reports

Generate reports on signature request activity, including usage data over specified date ranges.

### Fax

Send faxes and manage fax lines through the API. This is a separate feature from eSignatures.

### Branding / White Labeling

Dropbox Sign API offers various branding options to create a seamless, fully branded experience for your signers. Includes custom logos for embedded flows and white-labeling options for colors, button styles, and other UI elements (available on certain plans).

## Events

HelloSign supports webhooks (called "Events" or "Callbacks") that send real-time notifications to your application when actions occur.

Events can occur in two contexts: at the Account level and at the App level. Events scoped to an Account are called Account Callbacks while events scoped to an App are called App Callbacks. Each can have its own callback URL.

Once an event is sent, the callback URL must return an HTTP 200 with a response body that contains the string "Hello API Event Received." Callback URLs must use HTTPS. Events are sent as `multipart/form-data` POST requests. Event authenticity can be verified using HMAC with your API key.

### Signature Request Events

Events covering the full lifecycle of a signature request:

- **signature_request_sent** — The signature request has been sent successfully.
- **signature_request_viewed** — The signature request has been viewed by a signer.
- **signature_request_signed** — A signer has completed all required fields.
- **signature_request_all_signed** — All signers have completed the signature request (reliable indicator that the final PDF is ready for download).
- **signature_request_declined** — A signer declined the signature request.
- **signature_request_reassigned** — A signer reassigned to a different party.
- **signature_request_remind** — A reminder was sent to signers.
- **signature_request_downloadable** — An updated signed PDF is available for download.
- **signature_request_email_bounce** — A signer's email address bounced.
- **signature_request_canceled** — The request was canceled.
- **signature_request_expired** — The request expired.
- **signature_request_prepared** — The request has been prepared but not yet sent.
- **signature_request_signer_removed** — A signer was removed from an embedded request.
- **signature_request_invalid** — An error occurred processing the signature request data.

### Template Events

- **template_created** — A template has been created.
- **template_error** — An error occurred while creating a template.

### Account Events

- **account_confirmed** — A Dropbox Sign account created through your app has been confirmed.

### Error Events

- **file_error** — A file provided in a signature request couldn't be converted.
- **unknown_error** — An unknown error occurred while processing a signature request.
- **sign_url_invalid** — An embedded sign URL is invalid or expired.
