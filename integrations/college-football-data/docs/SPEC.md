The search results point to CollegeFootballData.com (CFBD) as the provider. Let me get more details on the API features.Now let me get the full API documentation to understand all feature categories.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for College Football Data

## Overview

College Football Data (CFBD) is an API providing access to college football datasets and analytics, including game results, team and player statistics, play-by-play data, recruiting information, betting lines, and advanced metrics. The API covers NCAA FBS college football with both current and historical data. It is available at `api.collegefootballdata.com`.

## Authentication

College Football Data uses API keys for authentication. API keys can be acquired from the CollegeFootballData.com website at `https://collegefootballdata.com/key`. The College Football Data API requires key authentication, but the key is free to acquire and use.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

You do NOT need to prefix your key with "Bearer" separately — the standard Bearer authorization scheme handles this.

The base URL for the REST API is `https://api.collegefootballdata.com`.

Subscribers in Patreon Tier 3 receive access to the new GraphQL API with realtime data subscriptions at `https://graphql.collegefootballdata.com/v1/graphql`. It will be the same API key you use on the CFBD API. There is no need to add a Bearer prefix or anything else. Just paste in your key.

## Features

### Games & Schedules

Retrieve game results, scores, and schedule information for college football seasons. Includes season calendar data, game media/broadcast information, game weather conditions, and live scoreboard data. Games can be filtered by year, week, season type (regular/postseason), team, and conference.

### Play-by-Play Data

Access detailed play-by-play data for games, including play types, play statistics, and live plays for in-progress games. Each play includes down, distance, yard line, play type, and result information. Play stat types can be enumerated for reference.

### Drives

Retrieve drive-level data for games, including start/end information, number of plays, yards gained, and drive result. Filterable by year, week, team, and conference.

### Team Information

Look up team details, FBS team listings, team rosters, team talent composite ratings, and historical matchup records between two teams. Also includes against-the-spread (ATS) records for teams.

### Player Data

Search for players by name, view player usage metrics, returning production data (how much production returns from the prior season), and transfer portal entries. Player data can be filtered by team, year, conference, and position.

### Statistics

Access both basic and advanced statistics at the team and player level, for individual games or full seasons. Advanced stats include metrics like success rate, explosiveness, havoc rates, and rushing/passing breakdowns. Statistical categories can be enumerated for reference.

### Recruiting

Retrieve player recruiting data including individual recruit ratings, team recruiting rankings, and aggregated positional group recruiting ratings. Filterable by year, team, position, and recruit classification (e.g., high school, JUCO, prep school).

### Rankings & Ratings

Access weekly AP/Coaches poll rankings and various team rating systems including SP+ (an advanced efficiency metric), SRS (Simple Rating System), Elo ratings, and FPI (Football Power Index). Ratings are available at both the team and conference level.

### Predicted Points & Win Probability

Query predicted points added (PPA) values for specific game situations (down, distance, yard line), and retrieve PPA aggregations by team, player, game, or season. Pre-game and in-game win probabilities are also available, as well as field goal expected points.

### Adjusted Metrics

Access adjusted player-level passing and rushing stats (WEPA — Weighted EPA), adjusted team season stats, and kicker Points Above Average Replacement (PAAR) ratings.

### Betting Lines

Retrieve betting lines (spread, over/under, moneyline) for games from various sportsbooks. Filterable by game, year, week, team, and conference.

### Coaches

Look up coaching records including seasons, teams, wins, losses, and other career information.

### NFL Draft

Access NFL Draft pick data, draft-eligible positions, and NFL team information. Filterable by year, team, and position.

### Conferences & Venues

Retrieve conference listings and venue/stadium information including location and capacity.

### GraphQL API (Experimental)

The experimental CFBD GraphQL API is available to Patreon Tier 3 subscribers. It does not yet have full access to the entire CFBD data catalog, but it does incorporate a decent amount. It allows flexible querying with custom filters, sorting, and field selection across the data model.

## Events

The REST API offers a few live endpoints that require constant polling. The experimental GraphQL API enables real-time data subscriptions, where your code is notified when data changes — available to Patreon Tier 3 subscribers.

### GraphQL Subscriptions (Experimental)

The GraphQL API supports real-time subscriptions where clients can subscribe to specific data queries and receive updates when the underlying data changes. For example, you can subscribe to betting line updates. This uses standard GraphQL subscription mechanisms over WebSocket connections. Only available to Patreon Tier 3 subscribers and covers a subset of the full data catalog.

The REST API itself does not offer webhooks or native event/push mechanisms.
