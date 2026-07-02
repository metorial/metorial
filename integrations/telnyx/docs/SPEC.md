# Slates Specification for Telnyx

## Overview

Telnyx is a cloud communications platform providing programmable voice, SMS/MMS messaging, fax, phone number management, SIM/IoT connectivity, number lookup, two-factor authentication (Verify), video, AI inference, and networking services via a RESTful API. It enables users to set up and port numbers globally, configure messaging, control VoIP and IP network functions, and define how communications are used in real time.

## Authentication

Telnyx supports two authentication methods:

### API Key (Bearer Token) — Primary Method

Telnyx uses API Keys as the primary authentication method across all services. API Keys carry significant privileges and provide access to all Telnyx resources associated with your account.

Most Telnyx APIs use Bearer token authentication in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

The Telnyx API V2 uses API Keys to authenticate requests. You can view and manage your API Keys by logging into your Mission Control Portal account and navigating to the Auth V2 tab in the "Auth" section.

The API Key will only be visible at the time of creation, so ensure it is securely stored.

### OAuth 2.0

Telnyx also provides OAuth 2.0 endpoints for authenticating and managing access to Telnyx resources. The OAuth token endpoint supports the `client_credentials` grant type and returns an access token, token type, expiration, scope, and optionally a refresh token. The token endpoint is available at the Telnyx API.

## Features

### Programmable Voice (Call Control)

Programmatically make, receive, and control voice calls. Supports call actions such as transfer, bridge, conference, record, play audio, gather DTMF input, and text-to-speech. Includes Voice, TeXML, and media APIs for real-time experiences. SIP connections can be configured with credential-based or IP-based authentication.

### Messaging (SMS/MMS)

Programmatically send and receive text messages, including SMS and MMS. Messages are managed through Messaging Profiles, which configure webhook URLs and other settings. Supports long codes, toll-free numbers, short codes, and alphanumeric sender IDs depending on country.

### Phone Number Management

Search, provision, and manage phone numbers, porting, verification, and identity services. Includes searching available numbers by various criteria, purchasing numbers, configuring number settings (call forwarding, CNAM listing, emergency services), and managing number porting (both port-in and port-out).

### Two-Factor Authentication (Verify)

There are currently five verification methods available: SMS, call (code spoken aloud), flashcall (caller's phone number used as verification code), WhatsApp, and PSD2. Verification profiles allow configuring templates, timeout, and webhook URLs. The API handles code generation, delivery, and verification.

### Number Lookup

Number Lookup allows you to input a number and receive back information about the number carrier and caller ID. Returns data including carrier details, line type, portability information, location, and CNAM data.

### Programmable Fax

Send and receive faxes in the cloud. Fax capabilities can be enabled on phone numbers with T.38 fax gateway support.

### IoT / Wireless SIM Management

With the Wireless API, developers can register and update SIM cards as well as view data consumption per SIM card. Manage large SIM card fleets using SIM card groups, which provide insight into data consumption and allow setting upper bounds for data usage via the data limit feature. SIM cards can be enabled, disabled, placed on standby, or decommissioned.

### Networking

Includes wireless SIMs, private networks, WireGuard, and cross-connect APIs. Allows creating and managing private network infrastructure.

### AI Inference

Build assistants, streaming chat, speech, and embeddings with Telnyx Inference APIs. Supports LLM-based chat completions, audio transcription/speech synthesis, and embedding generation.

### Storage

S3-compatible object storage APIs for storing and managing files and media.

### Account Management

Billing, payments, notifications, reporting, and account management APIs. Includes managing addresses, billing groups, invoices, balance, usage reports, and detail records.

## Events

Telnyx can send webhook events that notify your application any time an event happens on your account. Webhooks are configured on resources such as SIP Connections, Applications, and Messaging Profiles. A failover URL can be specified as a backup in case the primary webhook URL is unavailable. Telnyx signs webhook events using public key encryption so that the authenticity of the request can be verified.

### Voice / Call Control Events

Voice API webhooks provide real-time notifications about events occurring during call processing, enabling your application to respond to various telephony events with custom business logic. Includes events such as call initiated, call answered, call hangup, DTMF received, recording completed, speech recognition results, and more.

### Messaging Events

Telnyx gives you the option of using webhooks to notify you of new inbound messages to your SMS-capable long code and toll-free phone numbers. Event types include `message.received` (inbound message), `message.sent`, and `message.finalized` (delivery status updates). Webhook URLs can be configured per Messaging Profile or per outbound message request.

### Verify (2FA) Events

Webhook events such as `verify.sent`, `verify.delivered`, and `verify.failed` are pushed to your application as soon as they occur. Configured via the Verify Profile's webhook URL.

### Number Porting Events

Port-out events notify you of status changes on port-out requests. You can subscribe to webhook notifications for porting event types like `portout.status_changed`.

### Fax Events

Webhooks notify your application about fax transmission status changes, including sent, received, and failed events. Configured on the Fax Application resource.
