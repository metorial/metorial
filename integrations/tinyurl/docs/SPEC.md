# Slates Specification for TinyURL

## Overview

TinyURL is a URL shortening service that allows users to create short aliases for long URLs. It was launched in January 2002 by Kevin Gilbertson and is one of the oldest URL shortening services still in operation. The modern API is built on the OpenAPI standard and provides link shortening, management, analytics, and branded domain support.

## Authentication

TinyURL uses **API Token (Bearer Token)** authentication.

To use the TinyURL API, developers must first obtain an API key by signing up for an account on the TinyURL developer portal at https://tinyurl.com/app/dev.

Tokens are created by entering a token name and selecting specific permissions for the use case. You can create an API token that can be used to create, update, change, and delete TinyURLs by checking the relevant permission checkboxes.

The API token is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <YOUR_API_TOKEN>
```

The base URL for the API is `https://api.tinyurl.com`.

TinyURL allows users to create permission-specific API tokens. For example, there can be a token that can only be used to create TinyURLs, or one that can only be used to delete TinyURLs. It is possible to create a token with multiple or even all permissions.

Available token permissions for **free** users:

- Create TinyURL, Update TinyURL (update alias), and Archive TinyURL.

Additional permissions for **paid** users:

- Change URL (change destination URL), Manage TinyURL Expiration, and Use Bulk Requests (enables processing multiple links in one request, combined with other permissions like create or delete).

## Features

### URL Shortening

Create shortened URLs from long URLs. When creating a link, you can specify the target URL, domain (defaults to `tinyurl.com`), a custom alias, tags, an expiration date, and a description. Note that description, tags, and expiration (`expires_at`) only work with paid subscriptions; free accounts must leave these fields blank.

### Link Management

Retrieve, update, and delete shortened URLs. You can archive or unarchive TinyURLs on your account. You can fetch a list of all TinyURLs on your account using any valid token. Paid users can change the destination URL of an existing TinyURL.

### Link Analytics

View detailed analytics for shortened links, including total and unique clicks, likely human traffic, geographic distribution, referrers, devices, browsers, and popular days and times. Analytics are available on paid plans. Users can also tag and group shortened links together to get a more holistic view of marketing campaigns.

### Branded Domains

Manage branded domains by purchasing a domain through TinyURL or connecting an existing domain or subdomain. This allows creating custom short links that reflect your brand. This is a paid feature.

### Bulk Operations

Bulk requests enable processing multiple links in one API call, but the token must have additional permissions for the type of operation (e.g., create or delete). Available on paid plans only.

## Events

The provider does not support events. TinyURL does not offer webhooks or event subscription mechanisms through its API.
