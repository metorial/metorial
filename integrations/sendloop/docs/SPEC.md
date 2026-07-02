Now I have enough information to write a comprehensive specification. Let me compile what I've found.

# Slates Specification for Sendloop

## Overview

Sendloop is an email marketing and marketing automation platform for businesses of all sizes. It provides tools for managing subscriber lists, creating and sending email campaigns (including transactional and RSS-to-email), segmenting audiences, and tracking campaign performance with real-time reporting. It also offers a transactional email gateway (MTA) for delivering system-generated emails.

## Authentication

Sendloop uses **API key authentication** combined with an **account subdomain**.

- **API Key**: Obtain your API key from **Settings > API Settings** in your Sendloop account dashboard.
- **Account Subdomain**: Each Sendloop account has a unique subdomain (e.g., `yourcompany`), which forms part of the API base URL.

The API base URL follows the pattern: `https://{account_subdomain}.sendloop.com/api/v3/{Command}/json`

The API key is passed as a POST parameter named `APIKey` in each request, with `Content-Type: application/x-www-form-urlencoded`.

Example initialization (PHP wrapper): `new Sendloop\SendloopAPI3('YOUR_API3_KEY', 'SENDLOOP_SUBDOMAIN', 'json')`

There is no OAuth flow; all API access is governed by the single API key.

## Features

### Account Management

Retrieve account information and settings via the API. The API allows you to do anything you can do through the Sendloop interface via an API connection.

### Subscriber List Management

Import subscribers into your account, store unlimited attributes alongside email addresses, and use these attributes to personalize email content and narrow campaign targeting. Create, update, and delete subscriber lists. Lists can be organized into groups based on shared characteristics such as subscriber source or target audience.

- Supports single and double opt-in list configurations.
- Custom fields (unlimited) can be defined per list.

### Subscriber Management

Add new subscribers to specified lists and unsubscribe email addresses from lists. Browse, filter, search, and update subscriber profiles. Import subscribers in bulk.

- Subscribers can have unlimited custom attributes.
- Suppression list management for blocking specific addresses globally.

### Segmentation

The platform supports unlimited segments and audience attributes, allowing marketers to target specific groups within subscriber lists. Segments are rule-based (e.g., by subscription date, behavior, or custom field values).

### Email Campaign Management

Create and run email campaigns, automate transactional emails, and track campaign performance with real-time analytics.

- Supports plain text and HTML email content.
- Campaigns can be one-time or repeating (scheduled).
- Target campaigns to specific lists or segments.
- A/B testing capabilities for campaigns.

### Campaign Reporting

Learn who opened your email, where they opened it, when they opened it, which links they clicked, whether they forwarded it, or unsubscribed. All reports are in real-time.

- Track opens, clicks, bounces, unsubscribes, and forwards.
- Conversion and ROI tracking.

### Transactional Email Gateway (MTA)

A transactional email gateway for delivering emails such as new user signups, password resets, notifications, order confirmations, and shipment updates. The MTA is a separate service with its own API key, accessible via a dedicated SDK.

### RSS-to-Email

Automatically send updates from a blog or RSS content source to subscribers without manual intervention.

### Email Automation

Set up personalized email workflows that trigger based on customer behaviors, such as sign-ups, purchases, or inactivity. Includes automated sequences and journey-based automation.

### Sub-User Accounts

Delegate management of subscriber lists and email campaigns to select users, with granular permission control over specific lists and campaigns.

## Events

Sendloop supports webhooks that push subscriber-related event data to a specified URL.

### Subscriber Events

Sendloop automatically pushes subscriber data to your app whenever a certain event occurs. The supported webhook events are:

- **Subscription**: Triggered when a new subscriber is added to a list.
- **Unsubscription**: Triggered when a subscriber unsubscribes from a list.
- **Hard Bounce**: Triggered when an invalid (hard bounced) email address is detected.
- **Spam Complaint**: Triggered when a subscriber files a spam complaint.

Sendloop posts the subscriber data along with the event type to a webhook URL configured in the list settings, enabling you to keep your internal database synchronized with your Sendloop account.

Webhooks are configured per subscriber list in the list settings. Webhooks are available on the Pro plan and above.
