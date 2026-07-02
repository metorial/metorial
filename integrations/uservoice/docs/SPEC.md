Let me get more details on the webhook event types and the API resources available.Now I have enough information to compile the specification.

# Slates Specification for UserVoice

## Overview

UserVoice is a product feedback management platform that allows organizations to collect, organize, and prioritize customer ideas and feature requests. It provides companies with a centralized system to engage with their users, gather valuable insights, and enhance their products or services based on customer feedback. With UserVoice, users can submit feature ideas, build a ticketing system for customer support, and build a knowledge base for users.

## Authentication

UserVoice provides two distinct APIs with different authentication mechanisms:

### Admin API (v2) — OAuth 2.0 Client Credentials

Any interaction with the UserVoice Admin API requires a trusted API client.

1. To connect to the UserVoice API, start by creating a trusted API client in your UserVoice Admin Console by navigating to Settings → Integrations → UserVoice API keys. Click the button that says "Add API Key…" and enter a name for the client.
2. Leave the "APPLICATION URL" and "CALLBACK URL" text fields blank, and make sure the "Trusted" checkbox is checked. Then click "Add API key" to create the client.
3. Obtain a Bearer token by making a POST request using your API Key and Secret:
   - Endpoint: `https://{SUBDOMAIN}.uservoice.com/api/v2/oauth/token`
   - Parameters: `grant_type=client_credentials&client_id={KEY}&client_secret={SECRET}`
   - The response contains an `access_token`.
4. Once you've obtained a token, authenticate API requests by passing your access_token in the Authorization header (e.g., `Authorization: Bearer {token}`). All requests to the API will need to use this Authorization header for access.

**Important:** The base URL is tenant-specific: `https://{SUBDOMAIN}.uservoice.com/api/v2/admin/`. The subdomain is the unique identifier for the UserVoice account.

Tokens generated through the admin UI do not expire unless explicitly revoked. Tokens obtained via the API may expire, at which point a 401 error is returned and a new token must be requested.

### Helpdesk API (v1) — OAuth 1.0a

Helpdesk API requests can be divided into three categories: Unauthenticated Requests (only requiring the API Key as a query parameter), 3-legged OAuth requests (made on behalf of a user, e.g., voting on an idea or creating a comment), and 2-legged OAuth requests (made on behalf of the client, e.g., retrieving all users).

- Get the API KEY and API SECRET from the API client you created and use your UserVoice subdomain to authenticate.
- Base URL: `https://{SUBDOMAIN}.uservoice.com/api/v1/`

### Idea Collection API — OAuth 2.0 with PKCE

For client-side applications where the API secret cannot be safely secured, UserVoice supports the OAuth Authorization Code Flow with PKCE.

## Features

### Suggestions (Ideas) Management

Create, read, update, and manage product feedback suggestions. Suggestions are the core entity in UserVoice, each linked to a forum and optionally associated with categories, labels, and statuses. You can merge duplicate suggestions, link suggestions to features, and attach files to suggestions. Suggestions represent requested changes to your product, can be created by end users or your team, and each is linked to a forum where it can be visible publicly or to authorized users.

### Forums Management

Forums serve as distinct areas for collecting ideas on different topics or products. You can create and manage multiple forums, each with its own settings for visibility (public or private), prompt messages, and moderation preferences.

### User and Account Management

Manage users (both admins and end users) and their associated accounts. The API provides a transactional endpoint for importing external users that accepts up to 1,000 external users per call, each of which can embed an associated external account. User and Account Traits allow you to associate external data with UserVoice users, helping analyze feedback based on things like account segment or user type.

### Supporters and Voting

Track and manage supporters of suggestions. Supporters are end users that support a suggestion. You can retrieve supporter data and manage votes on ideas programmatically.

### Status Updates

Update and track the status of suggestions through their lifecycle (e.g., under review, planned, completed). Status updates help close the feedback loop with customers.

### Labels and Categories

Labels are used by admins to internally organize suggestions. Categories provide user-facing organization within forums. Both can be managed via the API.

### NPS (Net Promoter Score)

The API provides access to NPS ratings data. You can retrieve NPS scores and manage ratings submitted via the NPS widget.

### Notes and Comments

Create and manage internal notes on suggestions and public comments. Notes can have file attachments linked to them.

### File Attachments

The Admin API allows you to upload files and link them to suggestions via a two-step process: upload the file using the Attachments API, then use the returned token to link it to a suggestion.

### Teams

Manage teams within UserVoice. Admins and contributors can be assigned to teams to organize feedback by department, such as Sales, Support, or Product.

### Features (Roadmap Items)

Link suggestions to features for roadmap planning. You can create links between suggestions and features, as well as unlink them.

### SSO (Single Sign-On)

Generate SSO tokens to seamlessly authenticate your users with the UserVoice widget, so they can leave feedback without needing to sign in separately.

## Events

UserVoice supports Service Hooks (webhooks) that allow you to push UserVoice events to any URL. These are configured in the Admin Console under Settings → Integrations → Service Hooks.

### Suggestion Events

Triggered when new suggestions (ideas) are created. Includes the suggestion data in the payload.

### Vote/Support Events

Idea vote update events are triggered when users vote on or support a suggestion.

### Status Change Events

Triggered when the status of a suggestion changes (e.g., moved to planned, completed, etc.).

### Configuration Options

- By default, events will be pushed across forums, but you can choose to only push events from specific forums.
- Payload format can be specified as either XML or JSON.
- A callback URL must be provided to receive the webhook payloads.
- Webhook payloads include a `signature` parameter for verification, calculated using HMAC-SHA256 with your SSO key as the key and the `data` parameter as the message.
- Events are sent individually (no bundling).
