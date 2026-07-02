# Slates Specification for Hootsuite

## Overview

Hootsuite is a social media management tool that brings scheduling, content creation, analytics, and social listening to one place. The REST API allows you to build applications that interact with Hootsuite and operates on the same data — when you perform API calls, the changes are reflected in the user interface.

## Authentication

Hootsuite uses OAuth 2.0 to authenticate and authorize end users to use your application. Users authenticated with the Hootsuite API are subject to the same permissions configured in the Hootsuite Web Dashboard.

**Prerequisites:** You need an approved Hootsuite Developer account and a registered application. You will be able to see the app's REST API Client ID and REST API Client Secret in the app's configuration page.

**Base URL:** `https://platform.hootsuite.com`

**Endpoints:**

- Authorization: `https://platform.hootsuite.com/oauth2/auth`
- Token: `https://platform.hootsuite.com/oauth2/token`

**Supported Grant Types:**

Hootsuite supports 2 main grant types (authorization_code and refresh_token) and 2 custom grant types (member_app and organization_app).

1. **Authorization Code** — Standard OAuth 2.0 flow for web server apps. The user is redirected to Hootsuite to authorize, then an authorization code is exchanged for an access token. Required parameters: `client_id`, `response_type=code`, `redirect_uri`, and `scope`.

2. **Refresh Token** — Used to refresh expired access tokens. Refresh tokens don't have an expiry but can only be used once. Each refresh returns a new access token and a new refresh token.

3. **Member App** (custom) — The member_app grant type can only be used to authenticate Hootsuite users who have your App installed. Requires `grant_type=member_app` and a `member_id` parameter.

4. **Organization App** (custom) — The organization_app grant type can only be used to authenticate a Hootsuite Organization that has your App installed. Organizations used for prescreen components must be on the Enterprise plan, and the Organization App installation must be configured by Hootsuite. Requires `grant_type=organization_app` and an `organization_id` parameter.

**Scopes:** The scope was previously `oob`; your app should now request the `offline` scope when implementing the OAuth 2.0 authorization code flow.

**Client Authentication:** Getting a token requires passing the client ID and client secret within a basic authorization header.

**Token Expiry:** Access tokens expire after approximately 3600 seconds (1 hour).

## Features

### Message Scheduling & Publishing

Use the Publishing API to schedule content to post to social media accounts on a specific date and time including media. Messages can be scheduled for one or more social profiles. You can include text, media attachments, location data, tags, and webhook URLs for status notifications. Messages can also be retrieved, approved, rejected, and deleted. The scheduled time must be in UTC, ISO-8601 format; missing or different timezones will not be accepted.

### Media Upload

You can upload images and videos to Hootsuite for use in scheduled messages. Depending on file size, it can take time for the uploaded media to finish processing; call the retrieve media upload status endpoint to ensure your file state is READY before including it in your message.

### Social Profile Management

Before scheduling a message, you need to know which social profile to target. You can retrieve the social profiles of the authenticated Hootsuite member. Social profiles represent connected social media accounts (e.g., Twitter, Facebook, Instagram, LinkedIn, Pinterest).

### Organization Management

The API provides endpoints for Members, Messages, Organizations, Social Profiles, and Teams. You can retrieve organizations, list organization members, manage their permissions, and view which social profiles an organization has access to.

### Team Management

You can create teams within an organization, add or remove members from teams, and retrieve team-accessible social profiles. You can retrieve the members in a team and an organization's social profiles that a team can access.

### Member Management

You can retrieve member details, invite new members to an organization, and manage member permissions at the organization and social profile level. Use the User Management API to onboard users into a Hootsuite instance using the SCIM provisioning standard.

### Link Shortening (Ow.ly)

Use the Ow.ly API to shorten links. Available to Enterprise Users only.

### User Info

You can retrieve the currently authenticated user's profile information and their associated organizations via the `/v1/me` endpoint.

## Events

Webhooks allow apps to receive HTTP callbacks in real-time when events happen in Hootsuite rather than having to periodically poll the REST API. A webhooks URL for Organization Apps can be configured through My Apps. These apps will then be notified in real-time when events occur related to organizations that install the app.

Webhook payloads are delivered as JSON arrays of event objects, and integrity can be verified using the `X-Hootsuite-Signature` header (Organization Apps only) with SHA-512 HMAC.

### Message Events

Message events are triggered when a message's state changes. For example, an event will be triggered when a message is successfully sent, or when it fails to send. Event type: `com.hootsuite.messages.event.v1`. States include SENT, SCHEDULED, etc.

### Comment Events

Comments represent the comment that is to be published on a social network. Message events are triggered when a comment's state changes. For example, an event will be triggered when a comment is successfully sent, or when it fails to send. Event type: `com.hootsuite.comments.event.v1`.

### Application Events

These events represent changes to a registered application's state. There are two types of applications that work at different scopes: Member Applications, and Organization Applications. These are triggered when an app is installed or uninstalled.

### Ping Events

Ping events are used to test whether a callback URL is responding. You can safely ignore the contents of these events and simply return a 200 OK response. A successful response will reenable a callback URL that has been previously disabled due to failure. Event type: `com.hootsuite.ping.event.v1`.
