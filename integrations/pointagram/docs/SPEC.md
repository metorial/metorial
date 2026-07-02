Now let me check the Custom API 2.0 page for any newer API features:The Custom API 2.0 page appears to only contain a Swagger embed that didn't render. I have enough information to compile the specification now.

# Slates Specification for Pointagram

## Overview

Pointagram is a SaaS gamification platform that allows organizations to manage players, track points via score series, run competitions (leaderboards, head-to-head, etc.), award badges, create quests, and operate reward stores. It is used to motivate teams and individuals by turning performance metrics into point-based games and competitions.

## Authentication

Pointagram uses **API key authentication**. All API requests must include the following HTTP headers:

- **`api_key`**: Your API key, generated within Pointagram.
- **`api_user`**: Your Pointagram login email address.
- **`Content-Type`**: `application/json`

**Obtaining an API key:**

Go to your profile and click **Settings**, then **Integrations**. Add a Custom Integration and click **Create Credentials**. Name your integration and click "Show Key" to get your key. This key is the equivalent of a password. Click save and you're done.

The base API endpoint is `https://app.pointagram.com/server/externalapi.php/`.

A test endpoint is available at `https://app.pointagram.com/server/externalapi.php/test` to verify credentials.

For **embed/sharing** use cases (embedding profile pages, competitions, widgetboards, or the reward store into external sites), Pointagram uses an **App ID** and **App Shared Secret** to generate an HMAC-based authentication code. These are retrieved from the Custom Integration settings screen and should be kept server-side.

## Features

### Player Management

Create, list, and remove players. Players can be either online (with their own login) or offline (managed by an admin). Players are identified by name, email, or an external ID you provide. Removed players are soft-deleted; full anonymization must be done within the Pointagram UI. Admin users cannot be removed via the API.

### Team Management

Create and list teams, and add or remove players from teams. Team icons are mandatory and can use standard built-in icons (e.g., Bears, Bulls, Sharks) or custom-uploaded icons. Teams can be configured to be exempt from filter settings.

### Score & Points Management

Add points to players within specific score series. At the core of Pointagram's system is the Score Series — this is where all points are stored and structured. When adding points, you specify the player, score series, and point amount. Additional options include:

- **Tags**: Categorize score entries with tags for filtering.
- **Point types**: Use named point types instead of raw numeric values.
- **Source score ID**: A deduplication/idempotency key that revokes old transactions when resubmitted.
- **Comments**: Visible in the news feed.
- **Score time**: Backdate transactions to a specific time.
- **Auto-create players**: Optionally create players on-the-fly when adding scores.

You can also list score series, their point types, and query score history with filters by tags, teams, players, and time ranges.

### Competition Data

List competitions and their participating players. Competitions can be filtered by player (via email, name, or external ID), competition ID, or access key.

### Embeddable Widgets

Embed Pointagram content (player profiles, competitions, widgetboards, and reward stores) into external websites using iframes secured with HMAC authentication. This allows displaying gamification data directly within your own applications or portals.

## Events

The provider does not support webhooks or event subscriptions through its own API. Pointagram acts as a data sink — it receives points and player data via its API but does not provide a mechanism to push notifications or events back to external systems.
