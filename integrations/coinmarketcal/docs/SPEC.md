Let me fetch the actual CoinMarketCal API documentation to get more details.Now I have enough information to write the specification. Note that CoinMarketCal (not CoinMarketCap) is specifically a cryptocurrency events calendar. The current API (v1) uses API key authentication via the `x-api-key` header, while an older version used OAuth with client_id/client_secret.

# Slates Specification for CoinMarketCal

## Overview

CoinMarketCal is the economic calendar for the cryptocurrency market. It is evidence-based and community-driven. The API delivers information on cryptocurrency events and can serve as a critical data source for market sentiment analysis, trading, and investment strategies.

## Authentication

CoinMarketCal uses API keys for authentication.

To get started:

1. Get API keys from https://developers.coinmarketcal.com.
2. Include the API key in the `x-api-key` HTTP header with each request.

The base URL for API requests is `https://developers.coinmarketcal.com/v1/`, and the key is passed as a header like so:

```
x-api-key: YOUR_API_KEY
```

Note: An older version of the API (v2 on a different base URL) used OAuth2 with a client ID and client secret. The current recommended approach is the API key method described above.

## Features

### Cryptocurrency Event Search

Search and filter cryptocurrency events with customizable parameters including date ranges, specific coins, categories, and sorting options. Supports multiple language translations for event details.

- **Date range filtering**: Specify start and end dates to scope events to a particular time window.
- **Coin filtering**: Filter events for specific cryptocurrencies (e.g., Bitcoin, Ethereum).
- **Category filtering**: Filter by event category (e.g., hard forks, coin listings, partnerships, etc.).
- **Sorting**: Sort results by creation date or by trending/hot events.
- **Show only**: Filter to display only specific types of results such as hot events.
- **View counts**: Optionally include event view counts in results.

### Coin Listing

Retrieve a comprehensive list of available cryptocurrencies from the CoinMarketCal database for event tracking and monitoring purposes. Useful for populating dropdowns or discovering which coins have tracked events.

### Event Category Listing

Access a complete listing of event categories available in the CoinMarketCal system for organizing and filtering cryptocurrency events. Categories represent types of events such as exchange listings, airdrops, hard forks, partnerships, updates, and similar market-moving developments.

## Events

The provider does not support events. CoinMarketCal does not offer webhooks or purpose-built push/polling mechanisms. Event data must be retrieved by querying the API directly.
