# Slates Specification for DocuSign

## Overview

DocuSign (now Docusign) is an electronic signature and digital transaction management platform. It provides APIs for sending, signing, and managing documents and agreements electronically, along with additional services like clickwrap agreements, rooms for real estate transactions, admin management, and workflow automation.

## Authentication

All API applications must use the OAuth 2.0 flow for authentication, as legacy authentication methods are no longer accepted. DocuSign supports two OAuth 2.0 grant types:

### Authorization Code Grant (with PKCE)

Authorization Code Grant with PKCE is highly recommended as the first choice when a user is present and able to authenticate, due to its enhanced security.

- **Required credentials:** Integration Key (Client ID) and Secret Key.
- **Authorization endpoint:** `https://account-d.docusign.com/oauth/auth` (demo) or `https://account.docusign.com/oauth/auth` (production)
- **Token endpoint:** `https://account-d.docusign.com/oauth/token` (demo) or `https://account.docusign.com/oauth/token` (production)
- **Flow:** Standard OAuth 2.0 Authorization Code flow — redirect user to authorize, receive an authorization code, exchange it for an access token.
- A refresh token is used to obtain a new access token when the original access token is close to expiring.

### JWT (JSON Web Token) Grant

For scenarios without a user present, JWT Grant provides high security, though developers must carefully manage JWT lifetimes to minimize risk.

- To use JWT Grant, you will need an integration key, an RSA key pair, and the User ID GUID of the impersonated user.
- To authenticate in the JWT Grant flow, you will need to create a JWT assertion containing data on the authentication request, then exchange it for an access token.
- The JWT includes claims for `iss` (integration key), `sub` (user ID to impersonate), `aud` (auth server), and `scope`.
- To use the JWT grant flow with the eSignature REST API, your client ID must be granted the `signature` and `impersonation` scopes for the user.
- Before using the system user with the DocuSign APIs, you need to grant consent for your integration to impersonate that system user. This will be a one-time manual step through your browser that you will not need to do again unless someone manually revokes that consent.

### Scopes

Key scopes include:

- `signature` — Access to the eSignature REST API
- `impersonation` — Required for JWT Grant to act on behalf of a user
- `extended` — Extends refresh token lifetime
- `openid` — OpenID Connect profile access
- `click.manage` / `click.send` — DocuSign Click API
- `rooms_read` / `rooms_write` — Rooms API
- `organization_read` — Admin API
- Other scopes may also be required, depending on the DocuSign APIs and API methods your application will use.

### Important Notes

- After obtaining an access token, you must call the `/oauth/userinfo` endpoint to retrieve the user's base URI (API server), which varies per account and is required for all subsequent API calls.
- To use Authorization Code Grant, you will need an integration key and a secret key. These are configured on the Apps and Keys page in your DocuSign developer account.

## Features

### Envelope Management (Sending & Signing)

The DocuSign eSignature API empowers developers to integrate electronic signing capabilities directly into applications and websites, allowing businesses to send, sign, and manage documents securely and efficiently. You can create envelopes (the core unit containing documents and recipients), specify signing order, add form fields (tabs), set reminders and expiration, and track status.

- Supports sequential and parallel signing workflows.
- The API supports a wide range of workflows, such as sequential and parallel signing, making it adaptable for various use cases, including multi-party agreements and complex approval chains.
- Recipients can have different roles: signers, carbon copies, certified delivery, in-person signers, editors, agents, etc.

### Embedded Signing & Sending

DocuSign eSignature's support of embedded signing allows you to create seamless signing experiences for your users directly within your third-party websites and applications. You can also embed the sending/preparation view. This keeps users within your application instead of redirecting to DocuSign.

- Requires assigning a `clientUserId` to recipients to designate them as embedded signers.

### Templates

Templates allow you to quickly and easily create envelopes with predefined documents, recipient roles, and form fields. Templates can be created, managed, and used to generate envelopes via the API.

- Supports composite templates that combine server-side templates with inline document/recipient customizations.

### Bulk Send

Easily send the same document to a large number of recipients. Simply import a list of signers and each will receive a unique copy to sign.

- Create a bulk send list with recipient details, then initiate sending based on a template.
- Available on higher-tier plans.

### PowerForms

A PowerForm is a way to create a self-service online document for electronic signature without writing any code. PowerForms generate a unique URL from a template that recipients can use to initiate their own signing sessions.

### Document & Envelope Status Tracking

DocuSign tracks your transactions in real-time—every signature, approval and related recipient actions are logged and viewable. You can query envelope status, retrieve audit trails (certificates of completion), and download signed documents via the API.

### Account & User Administration

The Admin API allows managing users, groups, permission profiles, and account settings across an organization. This includes provisioning users, managing identity providers, and cloning account settings.

- Requires creating an organization in DocuSign and using the `organization_read` / `organization_write` scopes.

### Click API (Clickwrap Agreements)

The Click API enables creating and managing clickwrap agreements (e.g., terms of service, NDAs) that users accept with a single click. The DocuSign Click API's management methods require the `click.manage` scope.

### Rooms API

Provides a virtual workspace for real estate transactions, enabling collaboration on documents and tasks related to property transactions. Requires separate Rooms account setup and dedicated scopes (`rooms_read`, `rooms_write`).

### Web Forms

Allows creating interactive web-based forms that feed data into envelopes for signature. The Web Forms API is available in all developer accounts, but only in certain production account plans.

### Reporting & Data Export

Easily customize, run, export and print reports for your account. DocuSign reports on documents, recipients and overall account activity. Share data and statistics by exporting data from documents to a CSV file.

### Delegated Sending & Shared Access

Enable a user to be granted permissions to send or manage envelopes on another user's behalf. Assigned users can draft, send, void, correct or even organize envelopes.

## Events

DocuSign provides webhooks through its **Connect** notification service. DocuSign offers account-wide webhooks via Connect Custom configurations (subscriptions) and envelope-specific webhooks via the Envelopes:create `eventNotification` attribute.

Webhooks can be configured at two levels:

- Account webhooks can notify your app anytime any envelope in your account has a status change.
- Envelope webhooks are set per envelope. The envelope is typically created by an API request, by including the webhook configuration information as an `eventNotification` section of the request.

Payloads can be delivered in JSON or XML format. HMAC signature verification is supported for security.

### Envelope Status Events

Notifications when an envelope changes status: sent, delivered, completed, declined, voided, or timed-out. For both account and envelope webhook subscriptions, you can choose which envelope and recipient status changes should trigger a notification. For example, you can choose to be notified when the envelope as a whole is completed and fully signed, or whenever an individual recipient signs (or both).

### Recipient Status Events

Notifications when individual recipients change status: sent, delivered (opened), signed/completed, declined, authentication failed, or auto-responded.

### Envelope Correction Events

The envelope is corrected within the web application or via API calls. Triggered when a sender modifies an in-progress envelope.

### Envelope Resend Events

The envelope is resent within the web application or via the Envelopes API call.

### Envelope Purge Events

The envelope is queued to be purged within the web application or via the Update Envelopes API call.

### Envelope Discard/Delete Events

The envelope leaves a created or draft state and is sent out and deleted within the web application. Also triggers when draft envelopes are discarded.

### Click (Clickwrap) Events

Connect 2.0 opens the door to events like DocuSign Click, Delegated Signing, templates, resends, purges, corrections, and much more. Notifications when users accept or interact with clickwrap agreements.

### Template Events

Notifications for template-related changes such as creation, modification, or deletion.
