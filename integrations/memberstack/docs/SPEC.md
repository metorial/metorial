# Slates Specification for Memberstack

## Overview

Memberstack is a membership and authentication platform that allows websites and web applications to add user accounts, gated content, and subscription payments. It provides authentication, membership management, and payments through its Admin APIs. It integrates primarily with Webflow, WordPress, and custom JavaScript applications, with Stripe powering payment processing.

## Authentication

The Memberstack Admin REST API uses secret keys to authenticate requests. These keys provide full access to your account, so they must be kept secure.

You can view and manage your API keys in the Memberstack dashboard. There are two types of keys:

- **Test Mode (Sandbox) Keys**: Prefixed with `sk_sb_`. Used for development and testing, limited to 50 test members, no real charges processed.
- **Live Mode Keys**: Prefixed with `sk_` (or `sk_live_`). Used for production environments with no member limits.

**How to authenticate**: Use `X-API-KEY` headers with your secret key to authenticate with the API.

All requests are made to the base URL: `https://admin.memberstack.com`

Example:

```
GET https://admin.memberstack.com/members
Headers:
  X-API-KEY: sk_sb_your_secret_key
```

Secret keys carry administrative privileges, so they must be used in server-side environments only and never in publicly accessible places like client-side code, CMS platforms, or public repositories.

## Features

### Member Management

The Member object enables CRUD functionality on members in a Memberstack app instance. Methods are available for actions like listing members, retrieving members by ID or email, creating/updating members, deleting members, and managing a member's plans.

- Members can be created with an email, password, and optionally assigned to plans.
- Members have custom fields, metadata (arbitrary key-value data), JSON data, permissions, and plan connections.
- When deleting members, options exist to also delete the associated Stripe customer and cancel Stripe subscriptions.

### Plan Management

Members can be assigned to or removed from free plans programmatically. Plans can be added or removed from members using dedicated endpoints with a plan ID.

- Only free plans can be added/removed via the Admin API. Paid plan subscriptions are managed through Stripe checkout flows.
- Members can have multiple plan connections simultaneously.

### Token Verification

You can securely validate member authentication tokens server-side to protect sensitive resources and verify member identity.

- Verify JWT tokens issued to members to confirm their identity and session validity.

### Custom Fields and Metadata

Members support structured custom fields (defined in the dashboard), freeform metadata (key-value pairs), and JSON data storage for more complex data structures. These can all be read and updated via the API.

### OpenID Connect Integration

Memberstack supports custom authentication flows through its OpenID Connect integration. This allows you to use Memberstack as an identity provider for your applications while maintaining full control over the authentication experience.

## Events

Webhooks are a way for Memberstack to send data to your application in real-time based on specific events. Memberstack uses Svix to allow you to customize everything and easily inspect, test, and debug incoming webhooks.

Webhooks are configured in the Dev Tools section of the Memberstack dashboard. You can filter which event types are sent to each endpoint and optionally configure rate limiting per endpoint. Webhook signatures can be verified using a signing secret (prefixed with `whsec_`).

### Member Events

- **member.created** — Fires after a new member has been created. Payload includes member ID, email, metadata, and custom fields.
- **member.updated** — Fires after a member has been updated. Fires on email change, custom fields, and metadata. Does not fire on password change.
- **member.deleted** — Triggers when a member is deleted.

### Plan Connection Events

- **member.plan.added** / **member.plan.updated** / **member.plan.replaced** / **member.plan.canceled** — These events fire when a member's plan connections change.
- **member.planConnection.updated** fires after a plan connection has been updated, anytime the status of the plan updates, or payment period updates.
- **member.planConnection.canceled** fires when a member cancels a plan.
