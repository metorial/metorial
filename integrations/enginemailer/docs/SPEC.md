Now let me get more details on the webhook event types:Based on all my research, I have enough information to compile the specification.

# Slates Specification for Enginemailer

## Overview

Enginemailer is a cloud-based email marketing and automation platform offering subscriber management, email campaign creation, transactional email delivery, and autoresponders. It is an integrated cloud platform offering database management, email marketing, and transactional email solutions. Built on Microsoft Azure, it combines unlimited subscribers on every plan with powerful tools to design, send, and track campaigns easily.

## Authentication

Enginemailer uses **API Key** authentication for its REST API.

- The REST API uses the API key to authenticate users, and can be found on the following URL: https://portal.enginemailer.com/Account/UserProfile
- Generate an API key from the Enginemailer account → API Keys.
- The API key is passed as a parameter within the JSON request body (e.g., as `APIKey`). Some older/deprecated endpoints also require a `UserKey` (a user ID provided by Enginemailer) alongside the API key.
- It is advised to use the backend to trigger the API for security purposes. If you lose the key or the key is stolen, please regenerate the key in the user profile page.

No OAuth2 or other authentication methods are documented. Only API key-based authentication is supported.

## Features

### Subscriber Management

Automatically update your subscribers' information based on events or triggers from your source system, eliminating manual import processes. Through the API you can add, update, deactivate, or delete subscribers. Import contacts and custom fields to personalise messages. Detect and remove duplicates and bad email formats while growing your list. Segment your list based on demographics, interests, or behaviors to send more targeted and relevant messages.

- Supports custom fields for subscriber data.
- Tagging and untagging of subscribers is available.
- The campaign API only allows paid users to use the service. Subscriber API availability may differ by plan.

### Transactional Email Sending

Send real-time emails from any application using ready-made RESTful APIs to automate business processes. Ideal for sending system notifications, reminders, receipts, statements, etc.

- Supports HTML content and plain text.
- Substitution tags for personalization/dynamic content.
- File attachments (base64-encoded).
- Emails can be sent with or without pre-built templates.
- Requires a verified sending domain.

### Email Campaign Management

Automate your email campaigns directly from your source system, enabling you to create, send, and track campaigns using ready-made APIs.

- Create campaigns with HTML content via the API.
- The campaign content is not editable in the portal, but other parameters like campaign name, sender name and others are editable in the portal.
- Campaign API is restricted to paid plan users only.

### Autoresponders and Automation

Set up autoresponders, A/B test campaigns, and trigger emails via REST API. Configure pre-built email sequences for customer journeys including triggered events and auto-reply emails.

### Reporting and Analytics

Enginemailer offers comprehensive tracking and reporting features. Marketers can monitor open rates, click-through rates, bounce rates, and unsubscribes within the platform. Measure success with detailed reports, including geo, device, and engagement breakdowns.

## Events

Enginemailer supports webhooks for real-time event notifications. Once you create a webhook for an event and provide a callback URL, Enginemailer will automatically post JSON data containing necessary details every time the event occurs. Enginemailer provides the option to set up a webhook for specific events and for specific verified sending domains.

Webhooks are configured per verified sending domain under Domains → {domain} → Webhooks. Enginemailer treats status codes other than 200 or OK as failed and will not retry.

### Delivery Events

Notifications when an email is successfully delivered to a recipient.

### Bounce Events

Notifications when an email bounces (fails to be delivered).

### Open Events

Notifications when a recipient opens an email. Includes details such as open date, IP address, device category, device string, and country.

### Click Events

Notifications when a recipient clicks a link within an email. Includes details such as click date and the URL clicked.

### Unsubscribe Events

Notifications when a recipient unsubscribes from emails.

### Spam Complaint Events

Enter the callback URL for each event you want to monitor (e.g., Delivery, Bounce, Open, Click, Unsubscribe, Spam-Complaint). Notifications when a recipient marks an email as spam.
