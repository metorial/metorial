# Slates Specification for Customer.io

## Overview

Customer.io is a messaging and marketing automation platform that lets you send targeted messages (email, SMS, push notifications, in-app messages, Slack, and webhooks) to your audience based on their behavior and attributes. It provides APIs for tracking customer data, triggering automated and transactional messages, managing segments, and retrieving workspace data.

## Authentication

Customer.io uses two distinct sets of API keys for its different APIs. Both are found under **Account Settings > API Credentials**.

### Track API / Pipelines API — Basic Authentication

Track API keys are used to send behavioral tracking activity (events and attribute updates) into your workspace. API requests using the `https://track.customer.io/api/v1/` endpoint use these tracking API keys.

- Authentication: HTTP Basic Auth where the **Site ID** is the username and the **Track API Key** is the password.
- A Tracking Site ID is required with your Tracking API Key.
- For the Pipelines API (newer alternative), the base URL is `https://cdp.customer.io/v1/`.

### App API — Bearer Token Authentication

App API keys are used to trigger messages and broadcasts, or programmatically retrieve data from your workspace for analysis, troubleshooting, or reporting. API requests to `https://api.customer.io/v1/api/` use App API Keys.

- Authentication: Bearer token in the `Authorization` header (`Authorization: Bearer <APP_API_KEY>`).
- App API Keys are shown only once when created and stored as hashed values in Customer.io. Make sure to store these keys in a safe and non-public location.

### Region

Customer.io uses different API subdomains depending on the region you select. Options include: Global region (default URLs) for all non-EU countries/regions, and EU region which adjusts the Track API subdomain to `track-eu` and the App API subdomain to `api-eu`.

### IP Allow Lists

By default, access to the API is not restricted by IP address. On the Manage API Credentials page, you can create an allow list. When you create an allow list, any addresses on the list with valid credentials can use the API.

## Features

### People (Customer) Management

Identify and manage people in your workspace. You can create or update people with custom attributes, delete people, and look up people using complex filters. You can find members of your audience who meet specific criteria. People can be identified by ID, email, or `cio_id`.

### Event Tracking

Events are actions people perform in your app, on your website, etc—things like button clicks, scrolling to the bottom of a page, or purchases. When you send events, you can start campaigns and segment your users based on the things they do (or don't do) in your app. You can also track page views and screen views. Events support custom properties and optional timestamps for backdating.

### Objects and Relationships

An Object is a grouping mechanism in Customer.io—a way to associate people with an account, online courses, or recreational sports leagues. You set up an object with its own attributes, and then you can set relationships between people and the object. Objects can trigger campaigns and supplement people data in segments.

### Segmentation

Segments are named groups of people who share characteristics or behaviors. A Segment can have many people and a person can belong to many segments. You can use segments as recipient lists, campaign triggers, filters, conversion criteria and more. There are data-driven segments (automatic based on criteria) and manual segments (managed via CSV or API). You can retrieve segment membership via the API.

### Transactional Messages

You can trigger transactional messages: send receipts, password reset requests, and important notifications. You can trigger transactional messages for individual people when someone does something on your website or in your app. Messages can be sent via email, SMS, or push. You can use pre-built templates or provide full message content inline.

### Broadcasts

You can trigger broadcasts: set up a broadcast in the UI and then trigger it with a single call. You can trigger a message to a wide array of people when things like new products become available, you announce tickets for an event, etc. Broadcasts are API-triggered and can target segments or filtered audiences.

### Campaigns and Workflows

Retrieve information about campaigns, their actions, messages, and metrics. You can get campaigns, broadcasts, and messages, and look up information about your workflows and individual messages.

### Collections

Collections provide a way to store data in your workspace that you can use in campaigns with Liquid. A collection is a type of data in Customer.io that's separate from people or events. They represent any set of "things" that exist in your business. Collections can be managed via the API (create, update, delete) and can be sourced from JSON, CSV, or Google Sheets. Available on Premium and Enterprise plans only.

### Bulk Import and Export

You can import and export bulk data: import and export people in bulk. Exports can include attribute and event data for selected profiles or segments.

### Device Management

Register and remove devices (for push notifications) associated with people in your workspace. This is used for mobile push notification targeting.

## Events

Customer.io supports **Reporting Webhooks** that send real-time message activity events to a URL you configure.

Reporting Webhooks send real-time message activity events (e.g. sends, opens, clicks) as JSON in an HTTP POST. They're useful in many cases, including analyzing message activity outside of Customer.io.

### Event Categories

The supported webhook event schemas are: Customer Events, Email Events, SMS Events, Push Notification Events, In-App Message Events, Slack Events, and Webhook Events.

- **Customer Events**: Triggered when customer attributes change, such as when a person is subscribed or unsubscribed.
- **Email Events**: Includes events such as sent, opened, clicked, bounced, etc.
- **SMS Events**: Includes events such as sent, delivered, etc.
- **Push Notification Events**: Includes events such as sent, opened, etc.
- **In-App Message Events**: Events related to in-app message delivery and interaction.
- **Slack Events**: Includes Slack Drafted, Slack Attempted, Slack Sent, Slack Link Clicked, Slack Failed.
- **Webhook Events**: Includes Webhook Drafted, Webhook Attempted, Webhook Sent, Webhook Link Clicked, Webhook Converted, Webhook Failed.
- **Subscription Events**: Includes Subscribed, Unsubscribed, Subscription Preferences Changed.

### Configuration Options

- **Send Frequency**: By default, only the first click event is sent. You can set the Send Frequency on your Webhook Endpoint to record each click. By default, only one event per action (sent, opened, clicked, etc.) is sent to limit the output.
- **Body Content**: You can enable body content to include message body content (and email headers) in all "Sent" events.
- **Security**: Webhooks can be verified using an HMAC SHA256 signature via the `X-CIO-Signature` header and a webhook signing key.
- **Webhook-Triggered Campaigns**: Webhook-triggered campaigns let you use your JSON data in Customer.io without having to reshape it. A webhook trigger lets you start a campaign when you receive JSON data from a specific source. Customer.io generates a unique webhook URL for receiving inbound data.
