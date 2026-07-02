# Slates Specification for Proxiedmail

## Overview

ProxiedMail is a privacy-focused email proxy service that allows users to create unlimited unique proxy email addresses (aliases) that forward incoming messages to their real email inbox. ProxiedMail is a service that allows users to generate unlimited unique email addresses (proxy-emails) that forward incoming messages to their real email inboxes. It supports custom domains, webhook callbacks on received emails, and the ability to send messages from proxy addresses.

## Authentication

ProxiedMail supports two types of token-based authentication:

### API Token (Recommended for integrations)

The API token is passed via the `Token` HTTP header. You can obtain an API token manually from the ProxiedMail settings page at `https://proxiedmail.com/en/settings`, or programmatically via the API.

**To obtain an API token programmatically:**

1. Authenticate by sending a POST request to `https://proxiedmail.com/api/v1/auth` with your username (email) and password. This returns a Bearer token.
2. Use the Bearer token to call `GET https://proxiedmail.com/api/v1/api-token` with an `Authorization: Bearer TOKEN` header. This returns the API token.
3. Use the API token in the `Token` header for all subsequent requests.

### Bearer Token

Obtained from the `/api/v1/auth` login endpoint. Passed via the `Authorization` header. The Bearer token has an expiration date and is not refreshable — you must re-login to get a new one.

### Key differences

- The API supports both Bearer authentication and API key authentication (header name: `Token`).
- The API token does not expire but can be revoked by request. The Bearer token expires and requires re-authentication.

## Features

### Proxy Email Management

Create, list, and update proxy email addresses (aliases) that forward to one or more real email addresses. Proxy emails can be created on ProxiedMail domains (e.g., `abc@proxiedmail.com`, `abcd@pxdmail.com`, `abcde@pxdmail.net`). Each proxy email can be configured with:

- One or more real forwarding addresses.
- A callback/webhook URL to receive HTTP notifications on incoming mail.
- A type classification (regular or news).
- An `is_browsable` flag to enable browsing received emails via the API.
- To disable forwarding while still receiving callbacks, use `int.proxiedmail.com` as the real address.

### Received Email Browsing

View emails received by proxy addresses through the API. Requires the proxy email to have `is_browsable` set to true. You can only see received emails for proxy-emails with `is_browsable` opted as true, and you can update this attribute before any emails are received. The API allows listing received email links for a given proxy email and fetching individual email payloads including subject, body (plain and HTML), sender, headers, and attachments.

### Custom Domains

You can attach your own domain to ProxiedMail, allowing you to create unlimited proxy-emails with your custom domain. This requires pointing MX records to ProxiedMail. Domain-to-domain forwarding is also supported using wildcard masks.

### Contacts / Sending

Using the "Contacts" feature, users can initiate conversations from a proxy email address. Replies to forwarded emails are routed through ProxiedMail so the recipient only sees the proxy address.

### Built-in Webhook Receivers

ProxiedMail provides a built-in webhook receiver that gives you a unique webhook URL, which you can connect to a proxy email and then poll to check if a webhook payload was received. This is useful for synchronous workflows where you don't have a publicly accessible server to receive callbacks directly. You create a receiver, attach its URL to a proxy email, and poll its status endpoint until a payload arrives.

## Events

ProxiedMail supports webhook/callback notifications for incoming emails.

### Incoming Email Callback

ProxiedMail provides webhooks/callbacks for received emails. The backend calls the specified URL immediately after a new email is received.

- A callback URL is configured per proxy email when creating or updating it.
- The webhook payload includes all information about the email including subject, sender, recipient, body (plain and HTML), headers, and attachments.
- Each proxy email can have one callback URL. When an email arrives at that proxy address, ProxiedMail sends an HTTP POST to the configured URL with the full email payload as JSON.
- Webhooks also work with custom domain proxy emails.
