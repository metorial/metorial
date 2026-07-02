# Slates Specification for Unisender

## Overview

Unisender is one of the leading email marketing service providers in Eastern Europe, providing Email and SMS deliveries. It is a platform that empowers users to execute email and SMS marketing campaigns, allowing automation of managing contacts, designing emails, initiating campaigns, and analyzing results.

## Authentication

Unisender uses API keys for authentication. The API key can be obtained from the Unisender account settings panel (under the API section of account settings).

All API requests are made to the base URL `https://api.unisender.com/{lang}/api/{method}` where `{lang}` is the locale (`en` or `ru`) and `{method}` is the API method name. The `api_key` parameter must be included as a query parameter or POST parameter in every request.

Example:

```
https://api.unisender.com/en/api/getLists?api_key=YOUR_API_KEY&format=json
```

A locale must be specified in the URL path (`en` for English, `ru` for Russian). The `format` parameter can be set to `json` to receive JSON responses.

**Note:** Unisender also has a separate product called **Unisender Go** for transactional email, which uses its own distinct API key and different API endpoints (`go1.unisender.ru` or `go2.unisender.ru` depending on the data center). This specification covers the main Unisender marketing platform API.

## Features

### Contact List Management

Create, update, delete, and retrieve subscription lists. Subscribe or unsubscribe contacts (email addresses and/or phone numbers) to one or multiple lists. Import and export contacts in bulk with support for custom fields and tags. Check whether a contact belongs to specific lists and retrieve detailed contact information.

- Supports double opt-in configuration for subscriptions.
- Tags are shared across all lists (not list-specific), and custom fields are also global across all lists.

### Custom Fields and Tags

Create, update, delete, and retrieve custom contact fields and tags. Fields allow storing additional data (e.g., name, city) on contacts. Tags are used to categorize and segment contacts for targeted messaging.

### Email Campaigns

Create email messages (templates for campaigns), update them, and launch campaigns to send emails to contact lists. Supports scheduling campaigns for future delivery, A/B testing, read and link tracking, and cancellation of pending campaigns. You can also send individual emails to specific addresses and send test emails before launching a campaign.

- Sender domain verification is supported for managing authorized sender addresses.

### SMS Campaigns

Create and send SMS messages to contact lists or individual phone numbers. Check delivery status of sent SMS messages.

### Email Templates

Create, update, delete, list, and retrieve reusable email templates. Templates can be used when composing email messages for campaigns.

### Campaign Statistics and Reporting

Retrieve campaign status, common stats (opens, clicks, bounces), delivery statistics, visited links, and message lists. Get detailed information about individual messages and campaigns.

### Subscriber Notes

Create, update, delete, and retrieve notes attached to individual subscribers. Useful for adding internal annotations or CRM-like context to contacts.

### Account Management

Retrieve user account information. For reseller accounts, additional methods are available for managing sub-users, transferring funds, viewing payments, and managing tariffs.

## Events

Unisender supports webhooks for real-time event notifications. Webhooks are managed via the `setHook`, `listHooks`, and `removeHook` API methods. Events are delivered as JSON POST requests (optionally gzip-compressed) to a user-specified URL.

### Email Status Changes

Notifications when the delivery status of a sent email changes. Supported statuses include: sent, delivered, read, link visited, delivery retry, and various error/bounce statuses. Includes metadata such as email address, campaign ID, and delivery info (IP, user agent).

### Unsubscribe Events

Triggered when a contact unsubscribes from a list. Includes the email address, the campaign that prompted the unsubscribe, and the list IDs affected.

### Subscribe Events

Triggered when a contact subscribes to a list. Can be filtered to specific list IDs or triggered on any list subscription. A separate `subscribe_primary` event fires only when a contact subscribes for the first time.

### Campaign Status Changes

Triggered when a mass campaign's status changes (e.g., completed). Includes the campaign ID, status, contact count, and cost information.

### Email Verification

Triggered when a new sender email address is confirmed/verified for use as a return address.

### User Payment Changes (Resellers only)

Triggered when the account balance changes (main or bonus balance). Available only for reseller accounts.

### User Info Changes

Triggered when user profile information is modified (e.g., email, name, phone, company, timezone).

**Configuration options:**

- `event_format`: Choose between `json_post`, `json_post_gzip` (recommended), or `http_get` (deprecated).
- `single_event`: When enabled, each webhook call contains only one event rather than batched arrays.
- `max_parallel`: Configure maximum number of parallel webhook calls (default 10).
- Webhooks can be filtered to specific event types and subtypes (e.g., only specific email statuses or specific list IDs for subscribe events).
