Now let me try to access the Parma API docs directly to see what endpoints are available:Now I have enough information to compile the specification. Let me also note that Parma CRM is joining Folk (as seen on the homepage). Let me also check the Parma API Swagger docs:The Swagger UI page is JavaScript-rendered and doesn't provide content via fetch. Based on all the research gathered, here is the specification:

# Slates Specification for Parma

## Overview

Parma is a minimalistic CRM that helps you remember who your customers are, what they like, and when you last connected. It is a relationship management extension to sales CRM like Salesforce or HubSpot, focusing specifically on the often-neglected post-sales phase. Its core features are contacts, notes, and reminders, with a notes-based interface and automatic stay-in-touch reminders based on the last touch.

## Authentication

Parma uses OAuth authentication. It implements the standard OAuth 2.0 Authorization Code flow.

**OAuth 2.0 Authorization Code Flow:**

1. **Authorization endpoint:** `GET https://app.parma.ai/oauth/authorize`
   - Parameters: `client_id`, `redirect_uri`, `state`, `response_type=code`, `scope`

2. **Token endpoint:** `POST https://app.parma.ai/oauth/token`
   - Content-Type: `application/x-www-form-urlencoded`
   - Parameters: `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`, `code`

3. **Token refresh:** `POST https://app.parma.ai/oauth/token` (with `grant_type=refresh_token`)

Authenticated API requests use Bearer tokens in the Authorization header against the base URL `https://app.parma.ai/api/v1/`.

Example authenticated request:

```
GET https://app.parma.ai/api/v1/users/me
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
```

No specific OAuth scopes have been publicly documented.

## Features

### Relationship Management

Create new relationships and search for existing relationships in Parma. Relationships are the core entity in Parma, representing customer contacts and their associated information. This allows you to maintain a directory of all customer relationships with relevant details.

### Notes

Add new notes in Parma. Notes are attached to relationships and capture moments, touchpoints, and meeting notes from customer interactions. This provides a running log of all interactions with a given customer.

### User Information

Retrieve the authenticated user's profile information via the `/users/me` endpoint. This is useful for verifying authentication and retrieving account details.

### Google Calendar Integration

You can connect Parma CRM with your Google Calendar to make creating and managing relationships more simple and efficient. Parma CRM will recommend you add new relationships to lists based on the event data collected from Google Calendar.

- This is a built-in integration within Parma rather than an API feature directly available to third-party developers.

## Events

Parma supports a trigger that emits a new event when a new relationship is created. Based on available documentation, this appears to be implemented as a polling-based mechanism rather than native webhooks.

### New Relationship Created

Emits an event each time a new relationship is created in Parma. This can be used to trigger downstream workflows when new customers or contacts are added.

No native webhook subscription mechanism has been publicly documented for the Parma API. The event detection for new relationships is likely achieved through periodic polling of the relationships endpoint.
