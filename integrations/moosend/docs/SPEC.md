Let me get more details from the Moosend API documentation on Apiary.Now I have enough information to write the specification.

# Slates Specification for Moosend

## Overview

Moosend is an email marketing and automation platform that allows users to create and send email campaigns, manage mailing lists and subscribers, build marketing automation workflows, and send transactional emails. It provides a RESTful API (v3) for programmatic access to its core features.

## Authentication

Moosend uses API key authentication. A valid API key must be passed in each request to the Moosend API. This is a unique key for each account.

**How to obtain the API key:**

In the Moosend dashboard, on the menu bar, click More > Settings. On the menu on the left, click API key. On the API Key page, click Copy or click Generate API key if you require a new key.

**How to use the API key:**

The API key is specified as a query string parameter in the requesting URL. For example: `https://api.moosend.com/v3/campaigns/create.json?apikey=YOUR_API_KEY`

The base URL is `https://api.moosend.com/v3`.

The API supports both JSON and XML response formats, specified via the URL path (e.g., `.json` or `.xml`).

## Features

### Campaign Management

Create and manage email campaigns including newsletters, promotional offers, and product updates. Campaigns can also include transactional emails with dynamic and personalized content triggered by customer actions. Supported campaign types include:

- **Regular campaigns** — crafted email messages for newsletters, promotional offers, or product updates.
- **RSS campaigns** — connected to an RSS feed for automatic content updates.
- **Repeatable HTML** — automatically fetch new content from a designated website resource.
- **A/B testing** — test two different versions of a campaign (subject line, content, or sender).
- **Transactional campaigns** — email templates with dynamic content triggered from the API by a specific customer action.

Campaigns can be created as drafts, scheduled for delivery, sent immediately, or have scheduled dates removed. You can also remove a previously defined scheduled date from a campaign so it will be delivered immediately if already queued. Campaign analytics include metrics such as total sent, unique opens, unique link clicks, recipients count, complaints, and unsubscribes.

### Mailing List Management

Create, delete, and retrieve mailing lists in your account. You can get details for a given mailing list and optionally include subscriber statistics in the results.

### Custom Fields

Create custom fields in mailing lists to store additional subscriber data. Custom fields can also be removed or updated.

### Subscriber Management

Add new subscribers to a specified mailing list. If a subscriber with the same email already exists, an update is performed instead. Additional capabilities include:

- Unsubscribing a subscriber from a mailing list and campaign (the subscriber is moved to the suppression list, not deleted).
- Permanently removing a subscriber from a mailing list (without moving to the suppression list).
- Bulk removing subscribers from a mailing list.
- Retrieving subscribers from a mailing list filtered by status (e.g., Subscribed).

### Segmentation

Add segments to email lists to send targeted campaigns to a specific audience. Segments are created by defining criteria based on custom fields and user activity collected from previous campaigns.

- Create segments (without criteria) for a mailing list, specifying the name and how criteria match together.
- Add criteria (rules) to segments.
- Update segment properties including name and match type.
- Update existing criteria in a segment.
- Delete a segment and its criteria without affecting the subscribers.
- Retrieve segment details and the subscribers matching a segment's criteria.

### Transactional Email

Create transactional campaigns either using SMTP or through the API. Customize transactional emails with key/value pairs without creating different email templates for different recipients. Choose the variables that matter and control what customers receive and when.

- You can send any type of transactional email, including order confirmations, password resets, shipping updates, and appointment reminders.
- The Transactional API is available on the Moosend+ plan as an add-on.

### Campaign Analytics

Retrieve detailed campaign performance data including total sends, unique opens, unique link clicks, recipients count, complaints, unsubscribes, and delivery dates. A/B test campaign summaries are also available.

## Events

Moosend supports outbound webhooks via its automation workflow system rather than a dedicated webhook subscription API.

### Automation-based Webhooks

Moosend allows you to create automated webhooks to connect your workflow to other applications or third-party systems. The webhook is sent based on a specific trigger in your workflow — for example, sending user details to a CRM when they subscribe, or exporting user data when they make a purchase.

The webhook uses the POST HTTP method with a JSON payload type and a payload JSON schema to send data to a third-party system or application.

Webhooks are configured as action steps within Moosend's automation builder, not through the API. The available automation triggers that can fire webhooks include events such as:

- When someone subscribes to a list
- When someone unsubscribes
- When a purchase is made on a website
- Other automation trigger conditions available in the Moosend workflow builder

**Limitation:** Moosend does not provide a dedicated webhooks management API for programmatically registering or managing webhook subscriptions. Webhooks must be configured manually through the Moosend automation UI by adding a "Then post a webhook" action step to an automation workflow.
