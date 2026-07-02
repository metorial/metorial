# Slates Specification for Pinterest

## Overview

Pinterest is a visual discovery platform where users save images and videos ("Pins") to curated collections ("Boards"). The Pinterest API is an open, developer-centric API that allows developers to access and integrate various Pinterest functionalities into their applications. It supports a wide range of use cases, including content creation, analytics, and advertising.

## Authentication

Pinterest uses **OAuth 2.0** for authentication. Access to Pinterest APIs via User Authorization requires following a flow based on OAuth 2.0.

**Credentials Required:**

- **App ID** and **App Secret**: Get an application ID and secret by hitting the "Connect app" button at the apps dashboard.
- **Redirect URI**: Must be configured in the app settings.

**OAuth 2.0 Flow:**

1. Redirect the user to `https://www.pinterest.com/oauth/` with your App ID, redirect URI, response type (`code`), and requested scopes.
2. The browser is used to obtain an authorization code, and then the code invoked by the redirect exchanges the authorization code for an access token.
3. Exchange the authorization code for an access token at `https://api.pinterest.com/v5/oauth/token`.

**Token Lifetimes:**

- The access tokens have 30 days of lifespan, and the refresh token has 1 year lifespan.
- Access tokens can be refreshed using the refresh token without user interaction.

**Conversions API Authentication:**
While part of the Pinterest API, the Conversions API does not require an application or a valid app ID. You can start using the POST send conversions endpoint so long as you have a Pinterest Business Account and have generated a token through the Conversions page in Ads Manager.

**Available OAuth Scopes:**

- `ads:read` — Read access to advertising data
- `ads:write` — Write access to advertising data
- `boards:read` — Read access to boards
- `boards:read_secret` — Read access to secret boards
- `boards:write` — Write access to create, update, or delete boards
- `boards:write_secret` — Write access to create, update, or delete secret boards
- `catalogs:read` — Read access to catalog information
- `catalogs:write` — Create or update catalog contents
- `pins:read` — Read access to Pins
- `pins:read_secret` — Read access to secret Pins
- `pins:write` — Write access to create, update, or delete Pins
- `pins:write_secret` — Write access to create, update, or delete secret Pins
- `user_accounts:read` — Read access to user accounts

## Features

### Content Management (Pins & Boards)

Build apps and experiences that allow Pinterest users to create and manage organic content (Pins and Boards) on Pinterest. The API supports robust content creation capabilities, enabling developers to create and manage image and video Pins and boards. This includes creating board sections and managing secret (private) boards and pins.

### Advertising & Campaign Management

Use Pinterest API to manage ad campaigns, set up targeting, and report on campaign performance. This covers ad accounts, campaigns, ad groups, individual ads, audiences, and targeting configuration. For advertisers, the API offers robust tools for tracking the performance of ads, including metrics for ad accounts, campaigns, ad groups, and individual ads.

### Shopping & Catalogs

Pinterest API for Shopping allows you to create and manage your product catalogs on Pinterest as well as create, manage and report on shopping ads. The Pinterest API for Shopping allows developers to manage catalog items, making it easier to integrate product listings with Pinterest. This feature supports creating, updating, and deleting catalog items, ensuring that your product data is always up to date. This includes managing catalog feeds, product groups, and processing results.

### Conversions Tracking

The Pinterest Conversions API enables advertisers to send conversions directly to Pinterest via a server-to-server connection. Conversions captured with the Pinterest API can then be used for campaign optimization, targeting and conversion reporting. Supported conversion sources include web, in-app (Android/iOS), and offline events. Events are automatically deduplicated against the Pinterest Tag.

### Analytics & Reporting

Pinterest API helps you ingest analytics data for content and ads directly from Pinterest into your data warehouse or analytics tools. This includes organic pin analytics, user account analytics, and detailed ad performance metrics with targeting breakdowns.

### User Account Management

Read user profile information for the authenticated user, including account details and preferences.

### Trends

The API provides access to trending keywords and search term ideas on Pinterest, allowing discovery of what's popular on the platform.

### Audience Management

Create and manage custom audiences for ad targeting, including customer list audiences and engagement-based audiences.

### Business Management

Manage business accounts, including member access, asset permissions, and shared audiences across ad accounts.

## Events

The official Pinterest API does not have native webhook support. The API documentation focuses on RESTful endpoints for managing pins, boards, users, and other Pinterest objects.

The provider does not support events.
