# TelTel API Specification

## Overview

TelTel is a cloud-based telephony and call center platform that provides voice calling, SMS messaging, auto dialer campaigns, and webphone capabilities. It offers Direct Inward Dialing (DIDs) in over 75 countries, and allows integrating voice and SMS communication channels into web or mobile services using its Open API.

## Authentication

TelTel uses API key authentication for its RESTful API.

- **API Key**: The API requires an API key which can be found under the "Settings" section in your TelTel account.
- **Providing the API Key**: You can use one of two ways to specify an API Key in an HTTP request: specify the key in an HTTP query string parameter named `apikey`, or specify the key in an HTTP header named `X-API-KEY`.

Example using header:

```
GET https://api.teltel.io/v2/autodialers
X-API-KEY: your-api-key
```

Example using query parameter:

```
GET https://api.teltel.io/v2/autodialers?apikey=your-api-key
```

The base URL for the API is `https://api.teltel.io/v2/`.

## Features

### Voice Calls (Click2Call / Callback)

Initiate outbound calls programmatically. The server connects to the agent's phone (A leg) and then the phone of the person to reach (B leg). Both connections are made via the telephone line or SIP. You can specify caller IDs for both legs and use SIP devices or phone numbers.

### SMS Messaging

Send simple SMS text or automate services with 2-factor authentication by sending SMS codes. Send marketing campaigns using bulk methods. Two-way SMS is supported — receive inbound SMS via webhook or email.

### Auto Dialer Campaign Management

The Auto Dialer API provides tools for managing campaigns and contacts through a RESTful interface, allowing automation of dialing processes and campaign management.

- Create, update, and monitor campaigns programmatically.
- Add, update, and organize contact lists.
- Configure dialing settings to fit specific business requirements.

### Call Data Retrieval

Access detailed information about calls made through the platform. This includes call duration, time, status, and audio recording URLs. Download call lists with audio recordings.

### HLR (Number Verification)

Verify the availability and validity of phone numbers before initiating communication. Supports verifying phone numbers globally.

### User Management

Retrieve users associated with your TelTel account, including their SIP device details and individual API keys. This is useful for mapping CRM users to TelTel users when integrating the webphone.

### Call Forwarding via HTTP

Redirect incoming calls based on custom logic executed on your own server. When an incoming call is received, TelTel sends an HTTP request to your server, and your response determines where the call is routed. This is configured within the Call Flow builder.

## Events

TelTel supports webhooks and WebSocket events for real-time notifications.

### Call Event Webhooks

Webhook notifications are used to receive real-time information about call events, allowing you to connect and sync other applications such as customer databases, ERP, CRM, helpdesk, and chat systems with TelTel.

- Configured by entering a webhook URL in the account settings under "Webhook for full call notifications URL".
- Webhook responses are returned as JSON-encoded strings via the GET method.
- Requests contain information about all calls including parameters such as phone numbers, caller ID, user, start time, duration, and audio recording URL.
- Call events include: START, RING, RINGRESULT (answered, no answer, busy, etc.), READY, JOIN, LEAVE, and COMPLETED.

### SMS Event Webhooks

TelTel sends requests to your application via HTTP webhook containing information about SMS messages, including parameters such as phone numbers, status, sender ID, SMS ID, and time.

### Inbound SMS Forwarding Webhook

For DID numbers with SMS IN capability, you can configure forwarding of inbound SMS via webhook. The webhook includes originator, message content, message ID, recipient, and price.

### WebSocket Events

To receive live call notifications, you can also use WebSocket. Connect via `wss://events.teltel.io` and authenticate with SIP device credentials to receive real-time call events.


## Implemented API contracts

| Tool | Current documented endpoint |
| --- | --- |
| `initiate_call` | `POST /calls` with a `data` object |
| `send_sms` | `POST /sms/text` or `POST /sms/bulk/text` |
| `list_sms` | `GET /sms/reports` and `GET /sms/inbox/reports` |
| `list_calls` | `GET /calls` with a `filter` expression for dates |
| `hlr_lookup` | `GET /numbers/lookup/{numbers}` |
| `list_users` | `GET /users`, reading the `data` array |
| `list_campaigns` | `GET /autodialers` or `GET /autodialers/{id}` |
| `manage_campaign` | `POST /autodialers`, `PATCH /autodialers/{id}`, or `DELETE /autodialers/{id}` |
| `manage_campaign_contacts` | `GET/POST /autodialers/{id}/contacts` or `DELETE /autodialers/{id}/contacts/{contactId}` |
| `get_account_balance` | `GET /account/balance` |
| `list_user_caller_id_groups` | `GET /users/{id}/cidgroups` |
| `get_campaign_stats` | `GET /autodialers/{id}/livestats` |

Create campaign and contact requests use the documented `data` envelope; campaign PATCH accepts the partial property object directly. Campaign creation needs `name`, `campaign_type`, and a `caller_id` array. The optional `callerIds` input supplies that array, and `settings` supplies additional provider property names. SMS input `text` maps to `message`; sending requires `senderId`. Bulk sending creates one message object per recipient, with at most 1000 recipients per call.

Contact input `phone` maps to `phone_number` and `param1` through `param5` map to `custom_field_1` through `custom_field_5`. Import responses preserve the provider counts, and rejected contacts cause `success` to be false. Call user filtering and contact status filtering operate within the requested page. SMS history merges sent and received reports by timestamp by default; use `direction` to select one stream. For merged history, offset plus limit cannot exceed 5000.

The existing campaign `callflowId`, `callerIdGroupId`, and `status` fields and contact `name` field are preserved as legacy pass-through properties. Their write behavior is absent from the current public specification and remains unverified; omission is not treated as proof that the provider removed them. Configure campaign lifecycle operations in TelTel when relying on unsupported status updates. No profile/self endpoint is documented: connection profile metadata is populated only when a returned user's documented `api_key` matches the connection key.

Source: [Official OpenAPI documentation](https://apidoc.teltel.io/).


Bulk SMS responses can contain both accepted message IDs and recipient errors. `send_sms` preserves the complete provider response, reports `success: false` for partial acceptance, and adds optional `acceptedCount`, `rejectedCount`, and `failedRecipients` with request indexes and phone numbers. Retry only rejected recipients after fixing their errors; accepted messages should not be resent.
