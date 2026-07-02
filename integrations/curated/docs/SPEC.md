Now let me check if Curated supports webhooks:Based on my research, Curated (curated.co) does not natively support webhooks. The Pipedream "events" listed (email subscribed, email unsubscribed, issue published, link created) are polling-based mechanisms built by Pipedream, not native webhooks from Curated's API. Now I have all the information I need.

# Slates Specification for Curated

## Overview

Curated (curated.co) is a newsletter platform designed for creating and managing curated email newsletters. It provides tools for collecting links, organizing content into categorized issues, managing subscribers, and publishing newsletters with customizable templates and searchable web archives.

## Authentication

The Curated API uses token-based authentication. Each API request must include an HTTP header in the following format:

```
Authorization: Token token="API_KEY"
```

The API key can be found on your account page under "Account API Key".

- **Base URL:** `https://api.curated.co/api/v3`
- All API requests must be made over HTTPS; the API will not respond on HTTP.
- There is one API key per account. No OAuth flow or scopes are involved.

## Features

### Publication Management

Retrieve a list of publications associated with your account. Most endpoints require a publication ID. You can find a list of your publication IDs by using the publications endpoint.

### Issue Management

Fetch issue data from published issues or create drafts with the API. You can list all issues (filtering by published or draft state), retrieve full issue details including categories and items, create new draft issues, and delete draft issues.

- Issues can optionally include open and click rate statistics.
- Issue details include categories, text items, link items, and embedded links with their metadata.
- **Limitation:** You cannot publish issues via the API; publishing must be done through the Curated web interface.

### Link Management

Collect, organize, and manage links that can be included in newsletter issues. You can list collected links for a publication, retrieve individual link details, create new links, update existing links, and delete links.

- When creating a link, you can specify a URL, title, description, image URL, and category.
- Links can be moved into draft issues by updating the link's `issue_id` field. Once moved to a draft issue, the link no longer appears in collected items.
- Links can only be updated if they do not belong to a published issue.
- **Limitation:** You can only collect links, not text items.

### Subscriber Management

Email subscribers can be subscribed to your publication with the Curated API. You can list current subscribers, subscribe new emails, retrieve individual subscriber details, list unsubscribers, and unsubscribe emails.

- Subscribing a new email triggers a welcome email by default.
- Double opt-in settings configured for the publication are respected by default, but can be bypassed using the `sync` parameter (useful when syncing from another service where the subscriber has already opted in).

### Category Management

Retrieve the list of categories configured for a publication. Each category includes its code (identifier), display name, and whether it is a sponsored category with a per-issue link limit.

## Events

The provider does not support events. Curated's API does not offer webhooks or any built-in event subscription mechanism.
