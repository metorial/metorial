Now let me get more details about the API features:Let me get the full API docs to understand all features:Now I have enough information to write the specification.

# Slates Specification for Benchmark Email

## Overview

Benchmark Email is an email marketing platform that provides tools for creating and sending email campaigns, managing contact lists, and tracking campaign performance. It also offers features for marketing automation, signup forms, landing pages, surveys, and A/B testing.

## Authentication

Benchmark Email uses **API Key (Token) authentication** for its RESTful API v3.0.

- The base URL is `https://clientapi.benchmarkemail.com`. Users must obtain their Admin API Token from their Benchmark Email account (found under Account Settings > Integrations > API Key).
- The token is placed in request headers using the `AuthToken` header, along with `Content-Type: application/json`.
- Any Benchmark Email account type provides free API usage.

Example headers:

```
AuthToken: YOUR_API_TOKEN
Content-Type: application/json
```

Additionally, the API supports generating a 24-hour temporary API token using account credentials (username and password), which can be used instead of the permanent Admin API Token for shorter-lived integrations.

## Features

### Email Campaign Management

Create, update, duplicate, schedule, and send email campaigns. Retrieve campaign metrics such as opens, clicks, bounces, and unsubscribes. Search for campaigns by name and view campaign details. Supports resending campaigns to newly added contacts.

- Campaigns can be scheduled for specific dates/times with timezone support.
- Campaigns can be set back to draft status, clearing delivery schedules.

### Contact and List Management

Create contact lists, add single or multiple (batch) contacts to lists, and manage list details. Search for contacts and lists by various criteria including list name, list ID, and approval status. Retrieve active contact counts and list metadata.

- Contacts can be searched, added, updated, and removed from lists.
- Supports custom contact fields.
- Lists have an approval status that can be queried.

### Campaign Reporting

Get aggregated campaign metrics including opens, clicks, bounces, and unsubscribes. Find hard bounces, unsubscribed emails, and active emails in a list.

- Reports can be filtered by list ID or campaign name.

### Image Gallery Management

Upload, find, update, and delete images in the image gallery. Images stored in the gallery can be used in email campaigns.

### Signup Forms

Manage signup forms for collecting new subscribers, including forms integrated with Facebook pages. Configure form settings such as from-email and welcome messages.

### Surveys

Create, update, and delete surveys. Manage survey questions including creating, updating, and deleting individual questions. Customize survey appearance (colors).

### Autoresponders

Manage autoresponders including viewing details, listing them with filters, and updating their configuration. View autoresponder history and manage associated email addresses.

### Account Management

Access and manage account profile details. The API also supports sub-account authentication for partner accounts.

## Events

Benchmark Email supports webhooks that are configured per contact list. Webhooks send data to a specified URL in real-time when triggered events occur, eliminating the need for individual polling requests.

### Contact List Events

Webhooks are tied to specific contact lists and support the following event types:

- **Subscribes** — Triggered when a new contact subscribes to the list.
- **Unsubscribes** — Triggered when a contact unsubscribes from the list.
- **Profile Updates** — Triggered when a contact's profile/field data changes.
- **Cleaned Address** — Triggered when an email address is cleaned (removed due to bouncing or invalid status).
- **Email Changed** — Triggered when a contact's email address changes.

Webhooks can be configured for a single event or multiple events simultaneously. Webhooks are created per contact list and deliver data via HTTP POST as key/value pairs to the specified URL. Multiple webhooks can be added to a single list.
