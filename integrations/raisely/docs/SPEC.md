Now let me get the full API reference to understand all features:Now let me look at the full API reference to understand all resource types:Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Raisely

## Overview

Raisely is a fundraising platform for charities and nonprofits that enables organizations to accept donations, run peer-to-peer fundraising campaigns, sell event tickets, manage supporters, and handle recurring giving programs. It is used by non-profits and charities around the world to take donations, run events, sell tickets, and engage donors.

## Authentication

Raisely uses Bearer token authentication for all API requests. Raisely employs stateless authentication across the API. Tokens are passed via the `Authorization` header:

```
Authorization: Bearer {your access token}
```

There are two ways to obtain a token:

**1. Campaign Private Key (API Key)**

In your campaign admin, head to Settings > Developers to find your campaign private key. This key gives your application admin access to the campaign. For authorization purposes, any requests using the campaign private key will be treated as the first organisation admin (ORG_ADMIN).

**2. User JWT (Login-based)**

If you're using the API to authenticate end-users, the login routes will provide you with a JWT you can use to authenticate future requests. This token will provide access to public resources, or documents owned by that user. To obtain a JWT, POST to `https://api.raisely.com/v3/login` with an email and password. If you're logging in a participant, an organisationUuid must be present in the body.

**User Types & Permissions:**

| Type        | Description                                               |
| ----------- | --------------------------------------------------------- |
| ORG_ADMIN   | An administrator of the organisation                      |
| PARTICIPANT | A normal user that has signed up to one of your campaigns |
| ANYONE      | Any authenticated or unauthenticated user                 |

**Base URL:** `https://api.raisely.com/v3`

## Features

### Campaign Management

Retrieve and update fundraising campaigns within your organization. Returns a list of campaigns you've previously created. The campaigns will be returned in descending order of when they were created, unless you specify otherwise. Campaigns are the top-level container for all fundraising activity.

### Fundraising Profiles

Manage fundraising pages (profiles) within campaigns. Returns all fundraising profiles in a campaign. Profiles represent individual or team fundraising pages and support a hierarchical structure (individuals within teams, teams within organizations). Profiles can be created, updated, deleted, and have members added or removed. Profile totals and exercise totals are tracked automatically.

### Donations

List, create, and update donations within campaigns or profiles. External applications may use endpoints to import regular donations created offline into Raisely. Donations can be one-time or recurring, online or offline, and include details such as amount, currency, donor information, and payment method.

### Subscriptions (Recurring Giving)

Returns a list of subscriptions you've previously created. Creates a new subscription (otherwise known as a regular donation) in Raisely. Subscriptions control schedules for recurring payments including amount, billing interval, and status (OK, PAUSED, CANCELLED, etc.).

### User (Supporter) Management

Create, retrieve, update, and upsert user/supporter records. Upsert a user record, optionally tagging and creating an interaction. Users are shared across your Raisely organization between campaigns. Supports signup and registration flows.

### Products & Orders

Manage products (such as event tickets) within campaigns and handle orders. Products can be associated with campaigns and purchased through the order flow.

### Interactions & Tags

Track custom interactions (e.g., form submissions, volunteer sign-ups) on user records and apply tags for segmentation. The upsert endpoint allows creating or updating a user while simultaneously tagging and logging an interaction in one call.

### Posts

Manage blog posts on fundraising profiles. Posts can be created, updated, and deleted on individual profiles.

### Messaging

Create custom messages and SMS for your audience, whether that be your entire database or a custom segment you've created. The API supports sending custom messages to supporters.

### Webhooks Management

Add a new webhook to your Raisely account. By default, this webhook will trigger for events across all campaigns in your Raisely account. Specify a campaignUuid if you'd like to restrict it to one campaign. Webhooks can also be listed and managed programmatically.

### Private Data Access

Most Raisely resources have a concept of public and private data. This is how you store custom fields when someone registers, creates a profile or donates. To request private data just add `?private=true` on your request URL. Access to private data is governed by the authenticated user's permissions.

## Events

Raisely supports webhooks for real-time event notifications. Webhooks provide a way for Raisely to inform your application whenever something happens within one of your campaigns. They are real time, and available on all actions within Raisely.

You can subscribe to webhooks in the Raisely admin panel or programmatically through our REST API. Optionally enter a Shared Secret, used by your server to confirm the request came from Raisely. Each webhook payload includes context information such as UTM parameters, referrer, and user agent.

### Donation Events

Notifications for donation lifecycle: created, succeeded, updated, refunded, and deleted. Covers both online and offline donations.

### Subscription Events

Notifications for recurring giving lifecycle: created, succeeded, updated, failing, failed, rebilled, paused, resumed, cancelled, and deleted. Useful for tracking the health of recurring donor relationships.

### Profile Events

Notifications for fundraising page activity: created, updated, deleted, totalUpdated, exerciseTotalUpdated, memberAdded, joinedTeam, memberRemoved, leftTeam. Also includes badge.awarded and badge.revoked events. The team-related events fire at the specific point of change in the hierarchy.

### User Events

Notifications when a supporter is created or updated. Fired when a new user signs up or is created automatically from a donation.

### Order Events

Notifications for order lifecycle: created and succeeded. Covers ticket purchases and product orders.

### Post Events

Notifications for blog post activity on profiles: created, updated, and deleted.
