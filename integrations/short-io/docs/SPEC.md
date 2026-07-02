Let me fetch the API reference to get more details on features and API key types.Now let me check for more details on the API key creation and webhook specifics.Now I have enough information. Let me compile the specification.

# Slates Specification for Short Io

## Overview

Short.io is a URL shortening and link management platform that allows users to create branded short links using custom domains, track click analytics, and manage links programmatically. It is a comprehensive URL shortening and link management platform that helps businesses and developers create, track, and optimize their links. It provides connection of multiple domains and subdomains, links branding, statistics, team links management, mobile, country and region targeting, password, expiration and cloaking setting, and links QR code.

## Authentication

Short.io uses API key-based authentication. To pass the authentication process, you need to send an API key as the `Authorization` header.

**Creating an API Key:**

1. Sign in to your Short.io account and navigate to the Integrations & API menu → API.
2. When creating a key, you can set the API key type, enter a description, and restrict the key to a team or a domain.

**Key Types:**

There are two types of API keys:

- **Secret (Private) Key**: If you leave the option "Public key" disabled, this results in the creation of a private (or secret) key. Secret keys are used for server-side operations and have full access to manage links, domains, and statistics. They are scoped to a specific team or domain.
- **Public Key**: Used for client-side/browser-based operations (e.g., creating short links from JavaScript applications) with restricted capabilities.

**Usage:**

The API key is passed as the `Authorization` header value in each request to the base URL `https://api.short.io/`. For example:

```
Authorization: <<apiKey>>
```

The Short.io API features can only be accessed with an API key that you create for a specific domain/team. The API functionality is available in every price plan. The only prerequisite is that you are a registered Short.io user.

## Features

### Link Management

Create, update, archive, and delete short links. Using the API you can shorten a long link, shorten links in bulk, edit the title or short path of the original URL, delete a URL, and get the original URL. Links can be configured with custom slugs (paths), titles, tags, and TTL (time-to-live) for auto-expiration. You can also look up links by their original URL or expand a short link back to the original.

- Links can have `iphoneURL` and `androidURL` for mobile targeting, `expiresAt` for expiration, `expiredURL` for redirect-after-expiry, `cloaking` to hide the destination URL, and `splitURL` for A/B testing.
- You can customize the link slug by adding the Path parameter.

### Domain Management

You can use several branded domains and subdomains in one account. Add multiple domains, apply separate settings for every domain, and track the audience individually for each client, brand, website, or project. The API allows listing, adding, updating, and deleting domains.

### Geo and Device Targeting

Targeting links by country allows you to deliver content that is relevant to users in specific regions. The API supports creating, listing, and deleting rules for:

- **Country targeting**: Redirect users to different URLs based on their country.
- **Region targeting**: Targeting links by region enables you to customize content for users in specific areas.
- **Mobile targeting**: Mobile targeting redirects users to different URLs depending on the OS. One short link forwards users to two different URLs: iOS and Android. Supports deep linking with app package names and scheme-based URLs.

### Link Expiration

Set the expiration date and time to create temporary short links. Specify the expiration URL where visitors will be redirected after the old link has expired. Expiration can be set at link creation time or added to existing links. A TTL parameter can also be used for automated expiration.

### Link Security and Privacy

- **Cloaking**: Cloaking links adds an extra layer of privacy and security by hiding the destination URL.
- **Password Protection**: Limit the number of users who can access your website. Users must enter the correct password to follow the link. Password verification is available via the API.
- **Referrer Hiding**: Hiding referrers for your links helps protect user privacy and prevents third parties from tracking the source of your traffic.

### Statistics and Analytics

Track and measure the success of short links and domains by examining detailed statistics. You can find out information like your users' locations, operating systems, browsers, referrers, and times of clicks. Select a custom or predetermined date range, including the last 7 days, last week, or current month.

- **Link Statistics**: Retrieve detailed stats for individual links including total clicks, human clicks, browser breakdown, country, city, referrer, and social data.
- **Domain Statistics**: Retrieve aggregate statistics for an entire domain.
- **Clickstream**: Clickstream data shows a sequence of recent clicks. Track metrics like status code, method, referrer, and user agent for every click.
- **Top Links**: Request top-performing links by various columns.
- **Conversions**: Send conversion data to Short.io for tracking.
- Available periods for statistics: today, yesterday, total, week, month, lastmonth, last7, last30 and custom.

### QR Code Generation

Generate a QR code for a specified link. QR codes are dynamic and can be used for promotions, menus, and marketing materials.

### Open Graph Management

Retrieve and update Open Graph data for a given link. This allows customization of how links appear when shared on social media platforms.

### Bulk Operations

Use PHP, Python, Node.js, Ruby, or JavaScript to shorten 1,000 links every 5 seconds. CSV import via the command line is also supported.

## Events

Short.io offers real-time webhooks and advertises the ability to "get notified when links are clicked." However, the specifics of Short.io's native webhook configuration API (e.g., subscribable event types, registration endpoints, payload format) are not publicly documented in detail in their developer hub. Third-party integration platforms (such as Zapier and Pipedream) expose a "new event when a link is created" trigger for Short.io, suggesting at minimum:

- **Link Created**: Fires when a new short link is created in the account.
- **Link Clicked**: Notification when a short link receives a click (based on Short.io's mention of click notifications via webhooks).

The exact webhook registration mechanism and full list of supported event types should be confirmed with Short.io's support or documentation, as the public API reference does not expose detailed webhook management endpoints.
