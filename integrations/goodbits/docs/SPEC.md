# Goodbits Integration Specification

## Overview

Goodbits is a service that allows you to save articles from the web and build email newsletters in minutes, particularly suited for roundup-style newsletters. Users can send with Goodbits or any other email provider of their choice, with built-in analytics to track content performance.

## Documentation Availability

The provider's public website and API documentation could not be retrieved during
the October 2026 audit. The endpoint descriptions below record the existing
integration contracts; current provider availability and API compatibility remain
unverified. No additional endpoints are assumed from third-party catalogs.

Required response fields are checked against the integration's existing output
schemas. Missing or invalid fields produce an explicit response error instead
of invented counts, status confirmations, or content. These checks preserve
actual zeroes, empty strings, empty arrays, and the nullable analytics delta;
they may surface undocumented provider omissions as errors because the current
provider field guarantees could not be independently verified.

Provider-domain documentation locations checked:

- [Goodbits API documentation](https://goodbits.io/api)
- [Goodbits documentation](https://docs.goodbits.io/)

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

List sent newsletter emails with their subjects and send dates. The returned
email identifiers can be used with the email analytics tool. Individual email
content retrieval is not part of the current integration.

### Email Analytics

Retrieve performance analytics for sent newsletter emails, including:

- Number of recipients.
- Number of unique opens.
- Unique clicks and engagement rate.
- Per-link tracking with individual click counts and engagement rate percentages.
- Delta comparisons with previous email metrics.

## Events

No triggers are registered. A current provider webhook or event subscription
contract could not be verified during the audit.
