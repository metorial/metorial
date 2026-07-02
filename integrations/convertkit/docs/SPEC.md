Now let me fetch the V4 API authentication docs to get more details:Now I have enough information to write the specification.

# Slates Specification for ConvertKit

## Overview

ConvertKit (now rebranded as Kit) is an email marketing platform designed for creators such as bloggers, podcasters, and course creators. It provides tools for managing email subscribers, sending broadcasts, creating automated email sequences, building forms and landing pages, and selling digital products. The API (currently V4, with legacy V3 still available) allows programmatic access to manage subscribers, tags, forms, sequences, broadcasts, custom fields, purchases, and webhooks.

## Authentication

ConvertKit supports multiple authentication methods depending on the API version.

### API V4 (Current — recommended)

**1. OAuth 2.0** (required for public apps listed in the Kit App Store)

- When a user installs your app from the Kit App Store, Kit redirects them to the Authorization URL you've configured. Your app should present the user a screen to sign in. Kit appends a `redirect` query parameter. After the user authenticates, redirect them to Kit's OAuth server at `https://app.kit.com/oauth/authorize`.
- Token endpoint: `https://api.convertkit.com/oauth/token`
- Register your OAuth application in the OAuth Applications section at `https://app.kit.com/account_settings/advanced_settings`. Using the supplied Client ID and secret, redirect the user to Kit to grant your application access.
- The OAuth flow returns an access token and a refresh token. Access tokens expire and must be refreshed using the refresh token.
- If your app will be used in an insecure location where the client secret can't be kept confidential (such as mobile or single page apps), you must use the PKCE flow.
- Some endpoints require OAuth authentication — for example, bulk and purchase creation endpoints.

**2. API Key** (for personal account automation and testing only)

- API key authentication is the simplest way to access V4 of the API, tailored for programmatic access to your own Kit account for simple account automation, or for pulling account data for deeper external analysis.
- To use V4 API key authentication, pass the key alongside a `X-Kit-Api-Key` header when making requests.
- If you are looking to publish an app for public listing and installation, you must use OAuth and not API Keys. V4 API keys are only meant for individual use — for testing and for you to automate your own workflows.
- Create a V4 API key from the "Developer" tab in account settings.
- Base URL: `https://api.kit.com/v4/`

### API V3 (Legacy — deprecated)

- All API calls require the `api_key` parameter. Some API calls require the `api_secret` parameter. You can find your API Key and Secret in the ConvertKit Account page.
- The API key and secret are passed as query parameters or in the request body.
- Base URL: `https://api.convertkit.com/v3/`
- V4 API Keys are not compatible with V3.

## Features

### Subscriber Management

Create, update, list, and search subscribers. Subscribers can be filtered by status (active, inactive, bounced, complained, cancelled), date ranges, and custom fields. You can unsubscribe subscribers or update their information such as name, email, and custom field values.

### Tags

Create and manage tags to organize and segment subscribers. Tags can be added to or removed from individual subscribers. You can list all subscribers associated with a specific tag.

### Forms and Landing Pages

List and retrieve forms and landing pages. Add subscribers directly to forms, which can trigger opt-in confirmation depending on form settings.

### Email Sequences

List and manage email sequences (automated drip campaigns). Add subscribers to sequences to enroll them in automated email series. You can view sequence details and list subscribers in a sequence.

### Broadcasts

Create, update, list, and delete email broadcasts (one-time email sends). You can create and send broadcasts to your subscribers. V4 includes improved HTML support and access to subscriber filters for targeting.

### Custom Fields

Create, update, list, and delete custom fields for storing additional subscriber data. Custom field values can be set when creating or updating subscribers.

### Purchases

Import purchase/transaction data, including product details, pricing, and transaction metadata. Purchase creation endpoints require OAuth authentication.

### Segments

Access subscriber segments, which are saved filters for grouping subscribers based on various criteria.

### Email Templates

List available email templates that can be used with broadcasts.

### Account Information

Retrieve account-level information such as account name and plan details.

## Events

ConvertKit supports webhooks that send a POST request with a JSON payload to a specified URL when subscriber events occur.

### Subscriber Activation

Webhooks are automations that will receive subscriber data when a subscriber event is triggered. Fires when a subscriber becomes active. No additional parameters required.

### Subscriber Unsubscribe

Fires when a subscriber unsubscribes. No additional parameters required.

### Subscriber Bounce

Fires when a subscriber's email bounces. No additional parameters required.

### Subscriber Complaint

Fires when a subscriber marks an email as spam. No additional parameters required.

### Form Subscription

Fires when a subscriber subscribes to a specific form. Requires specifying a `form_id`.

### Sequence Subscription

Fires when a subscriber is added to a specific sequence. Requires specifying a `sequence_id`.

### Sequence Completion

Fires when a subscriber completes a specific sequence. Requires specifying a `sequence_id`.

### Link Click

Fires when a subscriber clicks a specific link in an email. Requires specifying the link URL via `initiator_value`.

### Product Purchase

Fires when a subscriber purchases a specific product. Requires specifying a `product_id`.

### Tag Added

Fires when a specific tag is added to a subscriber. Requires specifying a `tag_id`.

### Tag Removed

Fires when a specific tag is removed from a subscriber. Requires specifying a `tag_id`.

### Purchase Created

Fires when a new purchase record is created. No additional parameters required.
