Let me get the actual webhook payload details from the Ko-fi help page.# Slates Specification for Ko-fi

## Overview

Ko-fi is a platform that enables creators to receive donations (tips), sell digital and physical products through a shop, offer membership subscriptions, and accept commissions from supporters. It provides a simple way for fans to financially support creators without requiring a subscription model. Ko-fi does not offer a traditional REST API; its integration capability is limited to outbound webhooks for payment events.

## Authentication

Ko-fi uses a **Verification Token** to authenticate webhook payloads. There is no OAuth2 flow or API key-based authentication for a request-based API.

- In your Ko-fi account, locate the verification token in the advanced settings on the webhooks management page at `ko-fi.com/manage/webhooks`.
- The verification token is a UUID (e.g., `3401eedb-7a5e-4ceb-aa43-40038281222f`) included in every webhook payload as the `verification_token` field.
- It validates incoming requests to ensure they originate from Ko-fi using a verification token for enhanced security.
- Your webhook listener should compare the `verification_token` in the incoming payload against the token from your Ko-fi account settings to verify authenticity.

## Features

Ko-fi does not provide a traditional REST API with callable endpoints. The API is currently limited to when a payment is made. For instance, a webhook can notify you when you receive a membership payment but cannot inform you if the membership has ended.

### Payment Notifications via Webhook

The sole integration feature is receiving outbound webhook notifications when payments occur on your Ko-fi page. When a payment is made, Ko-fi will send an HTTP POST request containing all the payment data.

The webhook payload includes details such as:

- Supporter name, email, message, and whether the donation is public or private
- Payment amount and currency
- Transaction type (`Donation`, `Subscription`, `Shop Order`, `Commission`)
- Subscription-specific fields (whether it's a first or recurring payment, tier name)
- Shop order items (with direct link codes for digital products)
- Shipping information (for physical products)
- A unique transaction ID and message ID

**Limitations:**

- While they do not have a full blown API, they do have a webhook that we can redirect to our own endpoints. There is no way to query Ko-fi data, manage pages, create products, or perform any read/write operations via API.
- Your listener should return a status code of 200. If Ko-fi doesn't receive this status code, it will retry a reasonable number of times with the same message_id.
- The webhook is one-way and outbound only; you cannot subscribe to specific event types — all payment events are sent to a single configured URL.

## Events

Ko-fi supports outbound webhooks that fire on payment events. You head over to your webhooks page and specify the URL where Ko-fi should send the webhook.

### Payment Events

Webhooks are automated messages sent when something happens on Ko-fi. On Ko-fi, webhooks are sent when a payment happens. The `type` field in the payload distinguishes between event types:

- **Donation**: Triggers for every new donation. A one-time tip from a supporter.
- **Subscription**: Triggers for all Ko-fi subscription events (first-time and recurring). Includes both initial and recurring membership payments. The `is_first_subscription_payment` field differentiates between the two. May include `tier_name` if membership tiers are configured.
- **Commission**: Triggers for all Ko-fi commission events. Fired when a commission payment is made.
- **Shop Order**: Triggers for all Ko-fi shop order events. Includes `shop_items` with product details and may include shipping information for physical goods.

**Limitations:**

- The API is currently limited to when a payment is made. A webhook can notify you when you receive a membership payment but cannot inform you if the membership has ended.
- There is no support for events like membership cancellations, refunds, or page updates.
- Only a single webhook URL can be configured per Ko-fi account.
