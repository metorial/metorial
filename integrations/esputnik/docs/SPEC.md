Now let me get more details on the webhook statuses and the full API feature set:Now I have comprehensive information to write the specification.

# Slates Specification for Esputnik

## Overview

eSputnik (also known as Yespo) is a marketing automation platform that provides omnichannel messaging across Email, SMS, Viber, Web Push, Mobile Push, App Inbox, Telegram, and In-App channels. It offers contact management, audience segmentation, workflow automation, product recommendations, and campaign analytics for e-commerce and marketing use cases.

## Authentication

The eSputnik API supports Basic HTTP Access Authentication method with the API key used as the password.

To authenticate:

- In the Username field, enter any value. In the Password field, enter your API key.
- All API requests to eSputnik are sent to `https://esputnik.com/api/`, where you should input one of our methods' addresses after the last slash.

To generate an API key:

- Go to your profile → Settings → API. Click New key. In Description, enter the name of an application or a site where you want to use the key. Open the dropdown menu and select the access rights for the API key.

Access rights can be configured per key:

- You can give full access to all eSputnik API resources and methods by choosing Full access to API.
- To set up several integrations, create a key for each. You can create several keys with different access rights for the same account.

**Important:** If you don't use a key for 90 days, it is disabled automatically.

**Example (HTTP Basic Auth header):**

```
Authorization: Basic base64(anyvalue:YOUR_API_KEY)
```

## Features

### Contact Management

Add, update, delete, and search for contacts. It allows adding/updating one contact or a bulk of contacts, as well as moving contacts from one segment to another. Supports subscription management with double opt-in flows, managing unsubscribe lists per email address, and updating contact custom fields. You can add/update contacts from an external file — upload a file with contacts to your server and launch import from this file.

### Segmentation

Create and manage dynamic and static contact segments. Contacts can be assigned to segments, removed from them, and retrieved by segment. Segmentation can be based on web tracking events, user events, campaign activity, and contact profile data.

### Omnichannel Messaging

Create, manage, and send messages across multiple channels: Email, SMS, Viber, Web Push, Mobile Push, App Inbox, Telegram, and In-App. Messages can be sent as bulk broadcasts to segments or as individual triggered messages with dynamic content populated via Velocity templates. This method allows for generating different content for each recipient. Message delivery statuses can be tracked per recipient.

### Event Generation and Workflow Triggering

Triggered campaigns can be launched using the Generate event API method. This method is suitable for creating custom events. Events carry a type key, a key value (e.g., email address), and arbitrary parameters. Any type of event can be associated with a workflow launched when the event is generated. This is used for abandoned cart reminders, transactional emails, password recovery, and other triggered scenarios.

### Order Management

The Generate event method can also be used to transfer orders. Orders can also be added and deleted via dedicated API methods. Order data powers automated workflows like abandoned cart and post-purchase follow-ups.

### Product Recommendations

Personalized recommendations based on browsing history, orders, user demographics, and product reviews. Recommendation types include bestsellers, personal recommendations, similar products, and frequently bought together. Requires uploading a product feed and configuring data sources in the eSputnik dashboard.

### Broadcast Management

Create, schedule, retrieve, and cancel bulk message campaigns (broadcasts) to specific segments. Supports Email, SMS, and Viber channels.

### Account and Billing

Retrieve account information, organization balance, and billing history.

### Promotional Codes

Upload, retrieve, and count available promotional codes for use in campaigns.

### Product Feed Configuration

Configure and retrieve product feed settings for importing product catalogs used in recommendations and product blocks.

### Web Tracking and Site Management

Manage domains and web push domains, retrieve tracking scripts, and transfer website behavior data via REST API for use in segmentation and triggered campaigns.

## Events

eSputnik supports webhooks for tracking contact activity in real time. You configure a webhook URL in your account settings under Data Export, and eSputnik sends POST requests with JSON payloads whenever tracked events occur.

### Message Activity Events

Tracks the lifecycle of messages sent across all channels (Email, SMS, Viber, Web Push, Mobile Push, App Inbox, Widget, In-App, Telegram). The following activity statuses are available:

- **Sent** — message sent to the contact (Mobile Push only).
- **Delivered** — message was delivered.
- **Undelivered** — message could not be delivered (includes reason description; for Email, distinguishes hard vs. soft bounce).
- **Read** — contact opened the message.
- **Unsubscribed** — contact unsubscribed from the campaign.
- **Clicked** — contact clicked a link in the message (a separate event per link click).
- **Spam** — message was marked as spam.
- **Subscription Changed** — contact changed their subscription category.

You can select which statuses to track per webhook. Each webhook payload includes details such as contact ID, external customer ID, channel type, message ID, broadcast or workflow context, and timestamp. Optional basic authentication and custom headers (up to 5) can be configured for the webhook endpoint.
