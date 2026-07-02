# Slates Specification for Cutt.ly

## Overview

Cutt.ly is a URL shortening and link management platform. It provides API access for creating shortened URLs, editing link properties, and retrieving click analytics. It offers both a Regular API for individual accounts and a Team API for collaborative use.

## Authentication

Cutt.ly uses **API key** authentication. The API is available only to registered users; an API key can be generated on the Edit Account page. For the Team API, the API key can be generated in the Team edit page.

The API key is passed as a query parameter named `key` in every request. For example:

```
https://cutt.ly/api/api.php?key=YOUR_API_KEY&short=https://example.com
```

There are two separate API base URLs depending on usage context:

- **Regular API:** `https://cutt.ly/api/api.php` — available to all registered users.
- **Team API:** `https://cutt.ly/team/API/index.php` — available only to registered users with a minimum Team subscription plan.

No OAuth flow or additional scopes are required. Be cautious when generating or changing API keys, as this action will affect the functionality of any integrations using the previous key.

## Features

### URL Shortening

Create shortened URLs from long URLs. You can set click stats as public using the `public` parameter, and optionally include a custom alias (`name`), disable page title fetching (`noTitle`), or use a branded custom domain (`userDomain`).

- **Custom alias (back-half):** Specify a preferred short link name if not already taken.
- **Custom/branded domains:** Use your own domain instead of `cutt.ly`. Requires a paid subscription with an approved, active domain.
- **UTM tag support:** URLs with UTM parameters or other query strings are preserved when properly URL-encoded.
- Some features like `noTitle` are only available on higher-tier plans.

### Link Editing

Edit properties of existing shortened links. Available from the Single plan onwards. Editable properties include:

- **Alias/name:** Change the short link's back-half.
- **Source URL:** Change the destination URL the short link redirects to.
- **Title:** Modify the link's display title.
- **Tags:** Add or change a tag associated with the link.
- **Unique click tracking:** Configure unique click counting with customizable time windows (15–1440 minutes on Team plans).
- **Password protection:** Set or remove a password on a shortened link (via POST request with form-data body).
- **Link expiration:** Set expiration based on a click count or a specific date (YYYY-MM-DD), with a configurable redirect URL after expiration.
- **Mobile redirects and deep links:** Configure alternative redirect destinations based on mobile OS (Android, iOS, Windows Mobile). Supports deep links, deferred deep links (with Android package ID), and install referrer payloads.
- **AB/C testing:** Set up AB or ABC split tests on a link, specifying percentage distribution and variation URLs.
- **Deletion:** Delete a shortened link.

### Link Analytics

Retrieve click statistics for any shortened URL you own. Analytics data includes:

- Total clicks, with breakdowns by source (Facebook, Twitter, LinkedIn, other, bots).
- Referral domains and click counts per referrer.
- Device-level data: geography (country), device type, operating system, browser, device brand, and language.
- Bot click details.
- **Date range filtering:** Filter analytics by start and/or end date (Team plan and above).

### Team Link Management

The Team API mirrors the Regular API features but operates within a team context. It allows shortening links, editing existing short links, and accessing link analytics under a team workspace. Each team can have its own dedicated API key and custom domains.

## Events

The provider does not support events. Cutt.ly does not offer webhooks, event subscriptions, or purpose-built polling mechanisms through its API.
