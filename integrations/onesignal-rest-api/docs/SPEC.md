# Slates Specification for OneSignal REST API

## Overview

OneSignal is a multi-channel messaging platform that enables sending push notifications (mobile and web), emails, SMS/MMS, and in-app messages through a unified API. The API allows you to send push notifications, emails, and SMS, manage users, subscriptions, segments, export data, and configure apps. It supports grouping multiple platforms (mobile apps, websites) under a single App ID.

## Authentication

OneSignal uses API key-based authentication. There are two levels of API keys:

### App API Key

- Use an App API Key for most REST API requests related to a specific app.
- Include the key in the Authorization header with the `key` authentication scheme.
- Example: `Authorization: Key YOUR_APP_API_KEY`
- You can create both App and Organization API keys from the dashboard.
- You can create up to 16 API keys and configure IP allowlisting.

### Organization API Key

- The Organization ID (Org ID) is a UUID (v4) that groups all apps under your billing plan. You need it for Organization-level APIs such as Update an app.
- Organization API keys can only be created via dashboard.

### App ID

- The App ID is a public UUID (v4) that identifies your OneSignal app. You use it for initializing the SDK and making API requests such as Create message and Create user.
- Your App ID is safe to use in client-side SDK initialization. It is not a secret.

Both App API Keys and Organization API Keys are required to be passed in the `Authorization` header. Both are private secrets and must be stored securely. API keys are shown only once. If you lose the key, you must rotate it.

## Features

### Messaging

Send push notifications to apps and websites, transactional and promotional emails, SMS or MMS messages globally, and Live Activity updates to iOS devices. Messages can be targeted to segments, individual users, or specific devices. You can add dynamic content to personalize messages, send push notifications in multiple languages, control delivery speed, limit the number of push notifications per user, and send data-only notifications for background tasks.

### Templates

Templates are reusable push, email, and SMS messages that simplify development and improve consistency. Templates can be created, viewed, and managed via the API.

### User Management

Users and their subscriptions (devices) can be created, viewed, updated, and deleted through the API. You can add custom data attributes (tags) to your OneSignal Users. Users can have multiple subscriptions across different platforms and devices.

### Segmentation

A segment is a dynamic audience that groups Subscriptions or Users based on filters like activity, country, Tags, message activity, and more. Segments help you send personalized, timely, and relevant messages. Once created, segments update automatically as users interact with your app or site. Segments can be created and deleted via the API. You can combine multiple filters using AND or OR logic.

### Data Export

Export all user and subscription data. Export events like sent, received, and clicked. This enables analytics and data integration with external systems.

### Message Analytics

View message details and analytics. View individual message details. Track delivery, open rates, and click data for sent messages.

### App Management

OneSignal allows you to group platforms (mobile apps, websites) under a single App ID. Create an app, update an app, view a single app, and view all apps. Organization-level API keys are required for creating and updating apps.

### API Key Management

Create an API key, view all API keys, delete an API key, and update an API key programmatically through the API.

## Events

OneSignal supports webhooks for streaming event data in real-time. There are two webhook systems:

### Web Push Webhooks

Server-side webhooks triggered by web push notification interactions. Triggered immediately after a notification appears on the user's screen. Three event types are supported:

- **notification.displayed** – Triggered immediately after a notification appears on the user's screen.
- **notification.clicked** – Triggered when a user clicks on the notification body or any action button.
- **notification.dismissed** – Triggered when a user actively dismisses a notification or when it expires automatically. Browser support: Chrome only.

One webhook URL per event: You cannot set multiple webhook URLs for the same event type. Webhooks can be configured via the dashboard or SDK initialization code. HTTPS is required.

### Event Webhooks (Server-Side)

OneSignal offers Event Webhooks that allow you to stream data out of OneSignal to your chosen destination in real-time. These events can be related to different channels (e.g., push notifications, email, SMS) and can be sent through the same webhook or configured separately for more granular control. Event webhooks are configured under Settings → Webhook in the OneSignal dashboard, where you can select which events trigger the webhook. OneSignal allows you to personalize all fields in your webhook using information about the user and the message that triggered it.

### Journey Webhooks

OneSignal offers Journey Webhooks (available for annual plans) that allow you to add custom webhook steps to your customer journeys. These webhooks offer more configuration options and can be personalized based on user information. These are used to send data to external systems as part of automated messaging workflows (Journeys).
