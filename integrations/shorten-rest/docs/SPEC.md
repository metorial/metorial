Let me get more details from the API documentation and features page.Now I have enough information to compile the specification. Let me note the key findings:

- Authentication: API key via `x-api-key` header
- Features: URL shortening with aliases, geo/OS-based redirects, custom domains, click tracking, meta tags, snippets (tracking pixels), UTM parameters, vanity URLs
- No webhooks appear to be natively supported by Shorten.REST itself (third-party integrations like Zapier don't count as native webhooks, and Pabbly shows "No triggers found")

# Slates Specification for Shorten.REST

## Overview

Shorten.REST is a URL shortening API that allows programmatic creation and management of short URLs (aliases) that redirect to destination URLs. It supports branded custom domains, geo and OS-based redirect targeting, click tracking analytics, and meta tag customization.

## Authentication

Shorten.REST uses API key authentication. All methods of the Shorten.REST API require that your API key be provided in the `x-api-key` header.

To authenticate, include the API key as a request header:

```
x-api-key: YOUR_API_KEY
```

API keys can be obtained by signing up for a Shorten.REST account at [shorten.rest](https://shorten.rest) and accessing the key from the account dashboard. There are no OAuth flows or scopes; the single API key grants full access to the account's resources.

## Features

### URL Shortening (Alias Management)

The API allows you to programmatically create short URLs (an "alias") for longer URLs (a "destination"). Aliases can be created, retrieved, updated, and deleted. By default, unless you specify a vanity URI, a random string of seven characters will be generated. You can place the `@rnd` macro within the alias field to combine custom text with random characters (e.g., `/vanity/@rnd`). Each alias is unique within the domain it is related to.

- **Vanity/custom aliases**: Specify a meaningful custom string for the short URL path.
- **Random aliases**: Let the API auto-generate a random alias string.
- All API parameters are case sensitive.

### Geo and OS-Based Targeting

Each alias can redirect the end user to one or more destination URLs. A default destination is always set and specific destinations can be set to redirect the end user to preferred destinations based on the user's geographical location (country) and device Operating System. When a user clicks on the short link, Shorten.REST will examine the end user's country (determined by User's IP) and OS (User agent) and match the most suitable destination for each user.

- Configure different destination URLs per country and OS combination.
- A default destination is required; targeted destinations are optional overrides.

### Custom Branded Domains

You can choose to bind your own branded domain, sub-domain or use the default domain — Short.FYI. If multiple accounts use the same domain (e.g., short.fyi), and an alias is already taken, you may not create a new destination for it. To use a specific alias that is already taken, you must create it on a new domain attached to your account.

- Users can attach multiple custom domains to their account.
- Free SSL certificates are provided for custom domains.

### Click Tracking and Analytics

The API provides access to click data for shortened URLs. Click tracking includes data by referrer, user agent, browser type, operating system, and country. Click data can be retrieved and exported for analysis.

### Meta Tags

Aliases can be configured with custom meta tags (name/content pairs) that control how the short URL appears when shared on social media or other platforms. UTM builder and unlimited meta tags are available.

### Snippets (Tracking Pixels)

Shorten.REST has pre-made snippets to install pixels for Facebook, Pinterest, Google Analytics, Taboola, etc. Snippets can be attached to individual aliases or configured at the domain/account level to embed retargeting and tracking pixels that fire when users click short links.

- Snippets accept configurable parameters specific to the pixel provider.
- You can add retargeting and tracking pixels for each URL or at the account level.

### UTM Parameters

You can add UTMs to any URL. UTM parameters (source, medium, campaign, etc.) can be configured when creating or updating an alias, appending them to the destination URL for campaign tracking purposes.

## Events

The provider does not support events. Shorten.REST does not offer native webhooks or event subscription mechanisms through its API. Third-party automation platforms (e.g., Zapier) can be used to build workflows, but there are no built-in push-based event delivery features.
