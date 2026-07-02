# Slates Specification for Botbaba

## Overview

Botbaba is a no-code chatbot platform for creating and deploying WhatsApp and web chatbots, focused on e-commerce and lead generation. It is a No Code Chatbot Platform for creating WhatsApp Chatbots and Web Chatbots, primarily focused at eCommerce and Lead Generation. It is a chatbot platform where anyone can create their own chatbots, used for lead generation, customer support, operations, and as a budget alternative for mobile apps.

## Authentication

Botbaba uses API keys for authentication. The API key is referred to as an "auth token" in Botbaba's documentation.

**How to obtain the API key / auth token:**

1. Sign in to your Botbaba account at `https://app.botbaba.io`.
2. From the dashboard, click on your email/profile to go to your profile page.
3. Scroll down to find your auth token. Copy it for use in API requests.

**How to use the auth token:**

The auth token is passed as an `Authorization` header in API requests. Based on the Pipedream integration examples, API calls are made to `https://app.botbaba.io/api/` endpoints with an `Authorization` header containing the API key and an `Accept: application/json` header.

Example:

```
Authorization: <your_auth_token>
```

## Features

### Bot Management

Retrieve and manage chatbots associated with your account. The API exposes endpoints such as `GetBots` at `https://app.botbaba.io/api/GetBots` to list bots. This allows listing all bots and accessing bot configuration details.

### WhatsApp Template Messaging

Send WhatsApp template messages to users via the API. Botbaba provides different endpoints depending on the WhatsApp Business API provider:

- For 360Dialog: `https://app.botbaba.io/api/SendWhatsAppWAMessages`
- For Gupshup: `https://app.botbaba.io/api/SendWhatsAppTemplateMessages`

Template messages require a WhatsApp Business API integration configured in your Botbaba account. You can specify the recipient mobile number (with country code), the template to use, and the block to continue the conversation flow after the message is received.

### Chatbot Flow Builder

The platform supports conditional logic to decide conversation flow based on user input, and two-way communication between your API and the bot. Flows support 18+ input types including buttons, text input, checkboxes, radio buttons, ratings, date/time, location, file uploads, and product selection.

### E-Commerce

Chatbot functionalities tailored for e-commerce including ordering, product variation handling, shipping, and payment processing. Supports payment gateways such as Stripe, PayPal, and Razorpay. Products and categories can be bulk imported via Excel.

### Triggers and Actions

Botbaba provides a built-in automation system where triggers are paired with actions. Available triggers include:

- **Payment Success / Payment Failed** – fires when a payment through a native gateway integration succeeds or fails.
- **Chat Complete** – fires when a chat session is completed.
- **Chat Incomplete** – fires when a chat is not completed within 30 minutes.
- **Cart Abandon** – fires when a visitor adds items to the cart but does not complete the purchase (triggered after 30 minutes).
- **Manual** – triggered manually as needed.

Available actions that can be executed in response to a trigger:

- HTTP Request (call an external URL with JSON body and custom headers)
- Send WhatsApp Message
- Send Telegram Message
- Send Email

### Integrations

The platform features conditional logic, multi-language support, and native e-commerce integrations, with tools for lead qualification, SMS campaigns, and CRM integration. Supported third-party integrations include Shopify, WooCommerce, Google Sheets (via Pabbly/Konnectzit), Razorpay, Calendly, Telegram, and Webpushr.

### SMS Campaigns

Upload your data and launch SMS Campaigns using your own SMS API, track link clicks and do more by adding a bot link to your SMS. Campaigns can be auto-launched on a schedule.

### Analytics & Tracking

Botbaba offers analytics capabilities that provide insights into chatbot performance, user engagement, and conversation trends. It also supports adding Google Analytics, Facebook Pixel, and FullStory tracking snippets to bots.

## Events

Botbaba supports a trigger-and-action system within the platform that can send outbound HTTP requests (webhooks) when certain events occur. These are not traditional webhook subscriptions registered via the API, but rather configured through the Botbaba dashboard.

### Supported Event Triggers

- **Payment Success** – Fires when a payment through a native payment gateway integration is completed successfully.
- **Payment Failed** – Fires when a payment attempt fails.
- **Chat Complete** – Fires when a chatbot conversation is fully completed.
- **Chat Incomplete** – Fires when a chat session is not completed within 30 minutes.
- **Cart Abandon** – Fires when a user adds items to their cart but does not complete the purchase (triggered after 30 minutes of inactivity).

For each trigger, you can configure an **HTTP Request** action that sends a POST request with a JSON body and custom headers to an external URL, effectively acting as an outbound webhook. There is no API-based webhook subscription mechanism; triggers and actions are configured through the Botbaba dashboard UI.
