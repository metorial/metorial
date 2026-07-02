I see results about both "Epic Games" (the gaming company) and "Epic Systems" (healthcare). Let me focus on Epic Games specifically and dig deeper into their developer APIs.The Epic Games docs pages are blocking direct fetch. Let me search more specifically.Now I have sufficient information to write the specification. Let me note that many results about "Epic" webhooks relate to Epic Systems (healthcare), not Epic Games. Epic Games / EOS does not appear to have a traditional webhook system for their Web APIs.

# Slates Specification for Epic Games

## Overview

Epic Games provides Epic Online Services (EOS), a suite of cross-platform game services including player authentication, matchmaking, achievements, leaderboards, and social features. EOS offers both an SDK for direct game integration and Web APIs (RESTful endpoints) for server-side and service-to-service interactions. The services are available to any game developer regardless of game engine or storefront.

## Authentication

EOS uses the OAuth 2.0 protocol for authentication. You need to obtain OAuth 2.0 client credentials from Epic in the form of a **Client ID** and **Client Secret**, which are used when requesting an access token from the Epic authorization server.

Client credentials are created in the **Epic Developer Portal** under Product Settings > Client Credentials. Each client is assigned a **Client Role** (e.g., GameClient, GameServer, TrustedServer) which determines the permissions and accessible services.

### Token Endpoint

`POST https://api.epicgames.dev/auth/v1/oauth/token`

### Supported Grant Types

The following OAuth 2.0 grant types are supported: `authorization_code`, `client_credentials`, `device_code`, `exchange_code`, `external_auth`, and `refresh_token`.

- **`client_credentials`**: Used for server-to-server (trusted server) authentication. Send the Client ID and Client Secret as HTTP Basic Auth in the `Authorization` header. This does not authenticate a specific user.
- **`authorization_code`**: Used for user-facing authentication. The user is redirected to Epic's login page, authenticates, and is redirected back to your configured redirect URL with an authorization code, which is then exchanged for tokens.
- **`exchange_code`**: Used when a game is launched through the Epic Games Launcher, which provides an exchange code via command line parameters.
- **`device_code`**: Used for devices without browser input (e.g., consoles). A code is displayed to the user, who completes login on another device.
- **`refresh_token`**: Used to obtain a new access token using a previously issued refresh token.
- **`external_auth`**: Used to authenticate via external identity providers (Steam, PlayStation, Xbox, etc.).

All requests that require authentication use the `Authorization` header with a Bearer access token.

### Scopes

EOS supports scope flags that define the permissions required by your application. For example, if your application needs to see a user's friends list, you must request the `FriendsList` scope, and the user will be asked to consent during the login flow. Common scopes include:

- `basic_profile` – Access to basic account info (display name, etc.)
- `friends_list` – Access to the user's friends list
- `presence` – Access to user presence information
- `offline_access` – Allows refresh tokens for persistent access

### Two Authentication Layers

EOS has two distinct authentication interfaces:

1. **Auth Interface (Epic Account Services)**: Authenticates users with their Epic Games account. Required for social features like friends and presence. Players must have an Epic Games account to use these services.

2. **Connect Interface (Game Services)**: Handles connections between users' accounts under different identity providers. Maps external identities (Steam, PSN, Xbox, etc.) to an EOS Product User ID. Used for game services like matchmaking, stats, and achievements.

## Features

### Player Authentication & Account Management

Authenticate players via Epic Games accounts or external identity providers (Steam, PlayStation, Xbox, Nintendo, Apple, Google, etc.). Enables cross-platform play by allowing players from different storefronts to play together using a combined identity.

### Friends & Social

Retrieve players' friends and block lists, providing flexibility to deliver connected social experiences across devices and platforms. Includes presence information (online status, current activity).

### Achievements

Access data about player achievements, unlock them for a player, get data on a player's progression for an achievement, and send notifications to players when they unlock an achievement. Achievements are defined and managed in the Developer Portal.

### Leaderboards

Define leaderboards for your game, choose the stats to include, how you rank players, and the lifespan of the leaderboards. Leaderboard definitions are configured in the Developer Portal.

### Stats

Record and query player statistics (e.g., kills, wins, scores). Stats feed into leaderboards and achievements. Stats can be defined per-product and ingested via API.

### Player Data Storage

Store data for your game that is accessible to any player on any device where they can log in. Useful for cloud saves and cross-platform game progression.

### Title Storage

Store game-level data (not player-specific) that can be read by game clients. Useful for configuration files, patch notes, or dynamic content that doesn't require a game update.

### Lobbies & Sessions

Create and manage game lobbies through the Lobbies interface or your own trusted server application. Supports attributes, member management, and search/filtering for matchmaking.

### Matchmaking

Manage game sessions and match players together. Supports creating, finding, and joining sessions with configurable attributes and filters.

### Sanctions

Define and manage player sanctions (bans/suspensions) for your game. View the details of all sanctions placed on a player. Sanctions can be queried and managed both via the Developer Portal and through Web APIs.

### Player Reports

Allow players to report other players for misconduct. Reports can be submitted and queried to feed into moderation workflows.

### Anti-Cheat

Integrate Easy Anti-Cheat into your game to detect and prevent cheating. Managed via the Developer Portal with client-side and server-side components.

### Voice

Integrate voice chat into your game using the Voice Interface. Supports lobby-based voice rooms with trusted server token generation.

### Ecommerce / Ownership Verification

Access ownership information via RESTful endpoints. EOS has endpoints for direct online ownership verification, creating and validating ownership tokens, and entitlements services for enumerating and consuming entitlement records. Used to verify that a player owns a specific game or DLC.

### Metrics & Analytics

Set up the Game Analytics dashboard in the Developer Portal and track worldwide game activity, player retention, and online player counts.

### Kids Web Services (KWS)

KWS provides parent-verification and consent tools that simplify global youth management and reduce developer overhead. Designed for games and apps that serve minors.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms through its Web APIs. EOS uses real-time notification delivery through its SDK (via the `EOS_Platform_Tick` polling model and internal notification callbacks), but this is a client-side SDK mechanism, not a server-side webhook or event subscription system. KWS (Kids Web Services) does support webhooks for parental verification status changes, but this is limited to that specific sub-service.
