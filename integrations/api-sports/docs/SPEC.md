Now let me get the detailed documentation for API-Sports to understand the specific features across their different sport APIs.Now I have comprehensive information about API-Sports. Let me compile the specification.

# Slates Specification for API-Sports

## Overview

API-Sports is a RESTful sports data provider offering separate APIs for 12 sports: Football (Soccer), AFL, Baseball, Basketball, Formula 1, Handball, Hockey, MMA, NBA, NFL & NCAA, Rugby, and Volleyball. It provides real-time scores, fixtures, standings, team/player data, statistics, odds, and predictions across thousands of leagues and competitions worldwide.

## Authentication

API-Sports uses **API key authentication**. The API key must be sent as an HTTP header named `x-apisports-key` when connecting through API-Sports directly.

- **Header name:** `x-apisports-key`
- **Header value:** Your API key (obtained from the API-Sports dashboard after registration)

If connecting through RapidAPI, you need both `x-rapidapi-host` and `x-rapidapi-key` headers instead.

Each sport API has its own base URL following the pattern:

- `https://v3.football.api-sports.io/` (Football)
- `https://v1.basketball.api-sports.io/` (Basketball)
- `https://v2.nba.api-sports.io/` (NBA)
- `https://v1.{sport}.api-sports.io/` (other sports)

Your API key is available in the dashboard after registering an account. The free plan gives access to all endpoints simply by registering, with no credit card required.

## Features

### Multi-Sport Data Access

A single account provides access to all sport APIs: AFL, Baseball, Basketball, Formula-1, Handball, Hockey, MMA, NBA, NFL, Rugby, and Volleyball, in addition to Football. Each sport has its own dedicated API with sport-specific endpoints and data structures.

### Leagues and Competitions

Retrieve available leagues, cups, and competitions for each sport, filtered by country, season, or type. A coverage field on leagues indicates what data is available per competition (standings, events, lineups, statistics, etc.). Football alone covers over 1,200 leagues and cups.

### Teams and Players

Look up teams by country, league, or search query. Get detailed team information including venue details, logos, and rosters. Access player profiles, photos, and search for players by name. Transfer history is available for football.

### Fixtures and Live Scores

Retrieve match schedules, results, and live scores. Real-time games and events are updated every 15 seconds. Fixtures can be filtered by league, season, date, team, status (live, finished, scheduled), and round. Multiple fixture IDs can be queried in a single request.

### Match Events and Lineups

Access in-game events such as goals, cards, substitutions, and VAR decisions for fixtures. Retrieve starting lineups and formation data including player positions on the pitch.

### Statistics

Get detailed match statistics (possession, shots, corners, etc.) and team/player statistics aggregated over a season. Available statistics vary by league and sport — coverage can be checked via the leagues endpoint.

### Standings

Retrieve league tables and standings for any supported competition and season, including group stages and different ranking types.

### Odds and Predictions

Pre-match odds and live odds are available in all plans. Access odds from multiple bookmakers for fixtures. AI-generated match predictions are also available for football.

### Injuries and Suspensions

Retrieve player injury data and suspensions for supported leagues (availability varies by competition).

### Coaches

Access coach information including career history and photos (primarily for football).

### Formula 1 Specific

Access race calendars, circuit information, driver/team rankings, race results, pit stops, and grid positions.

### MMA Specific

Access fight cards, fighter profiles, and event results.

### Widgets

Embeddable HTML widgets are available for displaying sports data. They support multiple themes, multi-language support, and cover various data types across sports. Widgets work with all plans including the free plan.

## Events

The provider does not support events. API-Sports is a pull-based REST API and does not offer webhooks, event subscriptions, or any built-in push notification mechanism for data changes.
