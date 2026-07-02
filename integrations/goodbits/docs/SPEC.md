Now let me fetch the full API documentation page for more details:# Slates Specification for Goodbits

## Overview

Goodbits is a service that allows you to save articles from the web and build email newsletters in minutes, particularly suited for roundup-style newsletters. Users can send with Goodbits or any other email provider of their choice, with built-in analytics to track content performance.

## Authentication

Goodbits API is based on REST, uses JSON, and is authenticated by an authorization token header.

To authenticate API requests, an `Authorization` header key is required. This will authenticate the newsletter and scope the resources available on endpoints to that newsletter.

The API token can be found under your settings for the newsletter.

**Method:** API Key (passed as a header)

- **Header name:** `Authorization`
- **Header value:** Your API token (e.g., `Authorization: your-api-token`)
- **Base URL:** `https://app.goodbits.io/api/v1/`

Each API token is scoped to a specific newsletter. If you manage multiple newsletters, each will have its own API token.

## Features

### Newsletter Information

Retrieve details about the newsletter associated with your API token, including its ID and name. This is useful for verifying authentication and confirming which newsletter is being accessed.

### Subscriber Management

The API supports the ability to manage your subscribers. You can:

- **Add subscribers** with email (required), first name, and last name.
- **Change subscriber state** — possible statuses are active, unsubscribed, and deleted.
- Mark a subscriber as deleted, which prevents any future emails from being sent to them.
- **Retrieve subscriber counts** grouped by status (active, unsubscribed, deleted).

### Content Library Management

Create a link (content) in your Content Library. You can provide:

- A URL (required), title, description (HTML supported), and thumbnail image candidates.
- Thumbnail candidates will be shown in the editor by either those that are set in the created link or by those that are fetched from the URL.

This allows automated population of the content library from external sources, which can then be used to build newsletters in the Goodbits editor.

### Sent Email Retrieval

Retrieve details of sent newsletter emails. You can list sent emails with their subjects and send dates, and access individual email details.

### Email Analytics

Retrieve performance analytics for sent newsletter emails, including:

- Number of recipients.
- Number of unique opens.
- Unique clicks and engagement rate.
- Per-link tracking with individual click counts and engagement rate percentages.
- Delta comparisons with previous email metrics.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the Goodbits API.
