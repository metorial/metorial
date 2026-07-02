I notice references to CurrencyBeacon in the documentation links. Let me check if CurrencyScoop has been rebranded to CurrencyBeacon.Now I have enough information. CurrencyScoop appears to have been rebranded to CurrencyBeacon, with the API now hosted at `api.currencybeacon.com`. Let me compile the specification.

# Slates Specification for CurrencyScoop

## Overview

CurrencyScoop (now operating as CurrencyBeacon) is a REST API providing real-time and historical exchange rates for 168 fiat currencies and over 2,000 cryptocurrencies. Exchange rate data is retrieved from several major Forex data providers, central banks, and various commercial vendors in real-time. The API delivers data in JSON format and is designed for use in currency converters, financial software, and back-office systems.

## Authentication

CurrencyBeacon uses API keys to allow access to the API. You can register a new API key at their developer portal. Authentication is required for all API requests.

The API key can be provided in one of two ways:

1. **Query parameter**: Pass the key as the `api_key` query parameter.
   - Example: `https://api.currencybeacon.com/v1/latest?api_key=YOUR_ACCESS_KEY`

2. **Bearer token**: Pass the key as a Bearer token in the request header: `Authorization: Bearer YOUR_ACCESS_KEY`.

Sign in and copy your API key directly from your dashboard. The base URL for all API requests is `https://api.currencybeacon.com/v1/`. HTTPS is required for all requests.

## Features

### Real-Time Exchange Rates

Returns real-time exchange rate data for all available currencies. The data is updated based on your subscription plan frequency (e.g., every 60 seconds).

- **Parameters**: Base currency (e.g., USD), optional list of target currency symbols to filter results.

### Historical Exchange Rates

Retrieve historical exchange rates for any specific date in the past. The database goes back to January 1, 1996. This is useful for auditing, accounting, and trend analysis.

- **Parameters**: Base currency, specific date.

### Currency Conversion

The convert endpoint allows you to convert any amount from one currency to another using real-time mid-market exchange rates. This endpoint performs the calculation on the server side.

- **Parameters**: Source currency, target currency, amount.

### Time-Series Data

The time-series endpoint returns daily historical exchange rates between two specified dates. This is designed for plotting charts or analyzing volatility over time. Available on Startup and Pro plans only.

- **Parameters**: Base currency, start date, end date, optional target currency symbols.

### Supported Currencies List

Returns a list of all supported currencies, including their full names, symbols, and ISO codes.

- Useful for populating dropdowns or validating currency inputs in applications.

## Events

The provider does not support events. CurrencyScoop/CurrencyBeacon is a data retrieval API and does not offer webhooks or event subscription mechanisms.
