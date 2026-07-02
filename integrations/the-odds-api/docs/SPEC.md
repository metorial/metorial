Let me get more details from the official documentation.# Slates Specification for The Odds API

## Overview

The Odds API is a sports odds data provider that aggregates real-time and historical betting odds from 40+ bookmakers across 70+ sports and leagues. It provides pre-match and in-play odds, game scores, and historical odds snapshots via a REST API with JSON responses.

## Authentication

All requests use the host `https://api.the-odds-api.com`.

The Odds API uses **API key authentication**. Upon subscribing, you will receive an email containing your API key.

The API key is passed as a query parameter named `apiKey` on every request:

```
GET https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_API_KEY
```

There are no OAuth flows, scopes, or additional credentials required. A free API key can be obtained by signing up at [https://the-odds-api.com](https://the-odds-api.com).

## Features

### Sports and Leagues Discovery

Retrieve a list of all available sports and leagues, including metadata such as sport group, title, and whether the sport supports outright/futures markets. The sport key can be used as the `sport` parameter in other endpoints. This endpoint does not count against the usage quota. Both in-season and out-of-season sports can be listed.

### Live and Pre-Match Odds

A single request returns live and upcoming games for a given sport, betting market, and bookmaker region. Each game includes a start time, participants, and bookmaker odds for the specified region.

- **Markets**: Head-to-head (moneyline), spreads (handicaps), totals (over/under), and outrights (futures).
- **Regions**: Filter bookmakers by region — US, US2, UK, AU, EU — or specify individual bookmakers.
- **Odds formats**: Decimal or American.
- **Filtering**: By event IDs, commence time range, or specific bookmakers.
- Optional inclusion of bookmaker links, betslip links, source IDs, bet limits, and rotation numbers.

### Player Props and Additional Markets

Access extended betting markets for individual events, including player props (e.g., player points, passing touchdowns), alternate spreads, alternate totals, and period-specific markets (e.g., first quarter moneyline). Coverage varies by sport and bookmaker.

### Event Market Discovery

For a given event, retrieve which market keys each bookmaker currently offers. This is useful for discovering available props and secondary markets before requesting full odds data.

### Scores and Results

Game scores and results are available through a dedicated scores endpoint. Returns upcoming, live, and recently completed games (up to 3 days ago) with live scores that update approximately every 30 seconds. Game IDs match across odds and scores responses for easy correlation.

### Participants

Retrieve a list of known participants (teams or individual players) for a given sport. Useful for building reference data and mapping team/player names.

### Historical Odds

Historical snapshots of sports odds data are available back to 2020. Snapshots are captured at 5–10 minute intervals and include navigation to previous/next timestamps for iterating through time. Historical data is available for both featured markets and extended markets (player props, alternate lines, etc., available after May 2023). This feature is only available on paid plans.

### Historical Events

Retrieve event listings as they appeared at a specific historical timestamp. Useful for discovering historical event IDs needed to query historical event-level odds.

## Events

The provider does not support events. There are no webhooks, server-sent events, or built-in push/polling subscription mechanisms. All data access is pull-based via REST API calls.
