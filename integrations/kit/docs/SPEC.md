Now let me fetch the OAuth details page for more specifics on the OAuth flow.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Kit

## Overview

Kit (formerly ConvertKit) is an email marketing and audience-building platform designed for creators such as bloggers, course creators, and newsletter publishers. It provides tools for managing email subscribers, sending broadcasts and sequences, building forms and landing pages, selling digital products, and automating marketing workflows.

## Authentication

Kit's V4 API supports two authentication methods:

### 1. API Key Authentication

API key authentication is the simplest way to access V4 of the API, tailored for programmatic access to your own Kit account for simple account automation, or for pulling account data for deeper external analysis.

- Generate a V4 API key from the "Developer" tab in your Kit account settings at `https://app.kit.com/account_settings/developer_settings`.
- To use V4 API key authentication, pass the key alongside a `X-Kit-Api-Key` header when making requests.
- Example: `curl --request GET --url https://api.kit.com/v4/account --header 'X-Kit-Api-Key: <YOUR_V4_API_KEY>'`
- API keys are only meant for individual use. If you're creating something for people to use, you'll need to build an app for access to plugins, bulk endpoints, and higher rate limits.
- Some endpoints (e.g., bulk operations, purchase creation) are not available via API key and require OAuth.

### 2. OAuth 2.0

For apps and full API V4 support, you will need to authenticate via OAuth 2.0.

- Kit supports the **Authorization Code Grant** flow with two variants:
  - **Refresh Token flow** for web server applications.
  - **PKCE (Proof Key for Code Exchange) flow** for single-page apps or mobile apps where the client secret cannot be kept confidential.
- **Authorization endpoint:** `https://app.kit.com/oauth/authorize`
- Register your OAuth application in the Kit App Store settings at `https://app.kit.com/account_settings/advanced_settings`.
- First, register your OAuth application in the OAuth Applications section. Using the supplied Client ID and secret, redirect the user to Kit to grant your application access to their Kit account.
- Configuration requires: an **Authorization URL** (on your system), one or more **Redirect URIs**, and a **Secure application** toggle (disable for SPAs/mobile apps to enforce PKCE).
- Access tokens are passed via the `Authorization: Bearer <ACCESS_TOKEN>` header.
- If you are looking to publish an app for public listing and installation, you must use OAuth and not API Keys.

### Legacy V3 API

V3 is the legacy API that most older integrations were built on. For any third-party integrations that require a Kit API key to integrate, you'll need to provide them with a V3 API key found in Developer settings under the V3 API key section. V3 uses an `api_key` query parameter (and optionally `api_secret` for write operations). The base URL for V3 is `https://api.convertkit.com/v3/`. V3 is no longer in active development but remains accessible for the foreseeable future.

## Features

### Subscriber Management

Manage your email subscriber list, including creating, updating, listing, and unsubscribing subscribers. By default, Kit includes first name and email address on subscriber profiles, with the ability to create additional custom fields to store other types of information such as last name, phone number, or other data.

- Search and filter subscribers by status, tags, segments, or date ranges.
- View subscriber stats including email sends, opens, bounces, and last activity timestamps. Filter subscribers who opened specific broadcasts or clicked specific links.
- By default, Kit requires subscribers to double-opt-in for confirmation.

### Tags

Organize and segment subscribers using tags. Create, list, update, and delete tags, and add/remove tags from subscribers. Tags enable targeted email campaigns and trigger automations based on subscriber categorization.

### Custom Fields

Each Kit account is limited to 140 custom fields. Create, update, delete, and list custom fields. Custom field values are stored as plain text.

### Forms

List and manage sign-up forms and landing pages. Add subscribers to specific forms. Retrieve subscriber lists for individual forms.

### Broadcasts

Kit provides a fully functional Broadcast API with full HTML support and segmentation targeting. Create, update, list, and delete broadcast emails. Schedule broadcasts for future delivery and target specific subscriber segments.

### Sequences (Email Courses)

Manage email sequences (drip campaigns). List sequences, view subscribers for a sequence, and add subscribers to sequences.

### Segments

List and manage subscriber segments, which are saved filters for grouping subscribers based on various criteria (tags, custom fields, engagement, etc.).

### Purchases

Import purchase data from your favourite e-commerce platforms. Create and list purchase records associated with subscribers, enabling purchase-based automations and segmentation.

### Email Templates

List available email templates for use with broadcasts.

### Account Information

Retrieve account details and creator profile information, including plan type, timezone, and profile settings.

## Events

Kit supports webhooks through its V4 API. Webhooks are automations that will receive subscriber data when a subscriber event is triggered, such as when a subscriber completes a sequence. When a webhook is triggered, a POST request will be made to your URL with a JSON payload.

Webhooks are created via the API by specifying a `target_url` and an event name. Available event types are:

### Subscriber Activation

- **Event:** `subscriber.subscriber_activate`
- Fires when a subscriber is confirmed/activated in your account.

### Subscriber Unsubscribe

- **Event:** `subscriber.subscriber_unsubscribe`
- Fires when a subscriber unsubscribes from your emails.

### Subscriber Bounce

- **Event:** `subscriber.subscriber_bounce`
- Fires when an email to a subscriber bounces.

### Subscriber Complaint

- **Event:** `subscriber.subscriber_complain`
- Fires when a subscriber marks your email as spam.

### Form Subscription

- **Event:** `subscriber.form_subscribe`
- Fires when a subscriber is added to a specific form.
- Requires: `form_id` parameter.

### Sequence Subscription

- **Event:** `subscriber.course_subscribe`
- Fires when a subscriber is added to a specific sequence.
- Requires: `sequence_id` parameter.

### Sequence Completion

- **Event:** `subscriber.course_complete`
- Fires when a subscriber completes a specific sequence.
- Requires: `sequence_id` parameter.

### Link Click

- **Event:** `subscriber.link_click`
- Fires when a subscriber clicks a specific link.
- Requires: `initiator_value` parameter (the link URL).

### Product Purchase

- **Event:** `subscriber.product_purchase`
- Fires when a subscriber purchases a specific product.
- Requires: `product_id` parameter.

### Tag Added

- **Event:** `subscriber.tag_add`
- Fires when a specific tag is added to a subscriber.
- Requires: `tag_id` parameter.

### Tag Removed

- **Event:** `subscriber.tag_remove`
- Fires when a specific tag is removed from a subscriber.
- Requires: `tag_id` parameter.

### Purchase Created

- **Event:** `purchase.purchase_create`
- Fires when a new purchase record is created.
