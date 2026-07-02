I notice there are two different "Payhere" providers — PayHere.lk (Sri Lankan payment gateway) and Payhere.co (powered by Xendit). The search results from Pipedream reference payhere.co. Let me research payhere.co more specifically since it has a proper REST API.Now let me get more details on the API features.Now I have enough information to write the specification.

# Slates Specification for Payhere

## Overview

Payhere (payhere.co) is a payment platform that enables businesses to collect one-off and recurring payments from customers. It supports payment plans, subscriptions, customer management, and refunds, integrating with Stripe and GoCardless as underlying payment processors.

## Authentication

Payhere uses **API key** authentication via Bearer tokens.

- **API Key**: Found in the integrations section of the Payhere merchant admin at `https://app.payhere.co/merchants/integrations`.
- **Base URL**: `https://api.payhere.co` (production) or use the sandbox environment for testing.
- **Authorization**: Pass the API key in the `Authorization` header as `Bearer <api_key>`.

  Example:

  ```
  Authorization: Bearer your_api_key_here
  ```

- Alternatively, for GET requests, the API key can be passed as a query parameter: `?access_token=<api_key>`.

**Webhook Verification**: Webhooks are signed with a shared secret (also found in the merchant admin). The signature is an HMAC-SHA1 digest of the request body, sent in the `X-Signature` header.

## Features

### Company Management

- View and update the current company profile, including name, legal name, currency, VAT settings, support email, website, and address.
- Retrieve company statistics.
- Shows connected payment provider status (Stripe, GoCardless).

### Plan Management

- Create, update, and list payment plans (products/services) that customers can pay for.
- Plans can be one-off payments or recurring subscriptions.
- Configurable options include: name, description, price, currency, billing interval (week/month/year), setup fee, minimum billing cycles, auto-cancel after N payments, custom success URL, webhook URL, and pay button text.
- Plans can be hidden from the public landing page.
- Supports donation-style plans where the customer selects the amount.
- One-off plans can optionally show a quantity field.

### Payment Retrieval

- List and view individual payments.
- Payment records include amount, status, reference, card brand, custom fields, and timestamps.
- The API is read-only for payments; payment collection happens through Payhere's embeddable checkout or payment links.

### Customer Management

- List and view individual customer records.
- Customer data includes name, email, IP address, and location.

### Subscription Management

- List, view, and cancel subscriptions.
- Subscription records include billing interval, status, next charge date, and associated plan and customer information.

### Refunds

- Issue full or partial refunds for existing payments.
- A reason must be provided: `requested_by_customer`, `duplicate`, or `fraudulent`.

### User Information

- Retrieve the currently authenticated user's information.

## Events

Payhere supports both **webhooks** (configured per plan or in the merchant admin) and **REST Hooks** (programmatically subscribable via the API).

### Webhooks

Webhooks are sent as POST requests to a configured URL and signed with a shared secret using HMAC-SHA1. The signature is provided in the `X-Signature` header. The following event types are supported:

- **payment.success**: Fires when a payment completes successfully, including both first-time and recurring payments. Includes payment, customer, and plan data.
- **payment.failed**: Fires when a payment fails, including both first-time and recurring payment failures. Includes payment, customer, and plan data.
- **subscription.created**: Fires when a customer signs up for a subscription. Useful for free trial scenarios where `payment.success` may not fire immediately. Includes subscription, customer, and plan data.
- **subscription.cancelled**: Fires when a subscription is cancelled by the customer or automatically due to failed payments. Includes subscription, customer, and plan data.

### REST Hooks

REST Hooks allow programmatic subscription and unsubscription to events via the API (`/api/v1/hooks`). The supported resource types are:

- **payment_received**: Equivalent to payment success notifications.
- **subscription_cancelled**: Fires when a subscription is cancelled.
- **subscription_created**: Fires when a new subscription is created.

Each REST Hook subscription requires a `post_url` (the endpoint to receive events) and an `integration` name (a friendly identifier for the subscribing platform).
