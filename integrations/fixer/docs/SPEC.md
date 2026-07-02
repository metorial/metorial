# Slates Specification for Fixer

## Overview

Fixer is a foreign exchange rate API that provides real-time and historical currency exchange rate data for over 170 world currencies. It delivers JSON-formatted data aggregated from 15+ trusted financial sources, including banks and the European Central Bank. Historical exchange rate data is available all the way back to 1st January, 1999.

## Authentication

Fixer API uses API keys to authenticate requests. There are two methods of passing the API key depending on which API host you use:

1. **Via query parameter (data.fixer.io):** Your API Key is the unique key that is passed into the API base URL's `access_key` parameter in order to authenticate with the Fixer API. Example: `https://data.fixer.io/api/latest?access_key=YOUR_ACCESS_KEY`

2. **Via HTTP header (api.apilayer.com):** All requests made to the API must hold a custom HTTP header named `apikey`. Example: `--header 'apikey: YOUR_API_KEY'` with base URL `https://api.apilayer.com/fixer/`.

To obtain an API key, sign up for an account at fixer.io. You can view and manage your API keys in the Accounts page. All API requests must be made over HTTPS. Calls made over plain HTTP will fail.

## Features

### Latest Exchange Rates

Returns real-time exchange rate data for all available or a specific set of currencies. Exchange rates delivered by the Fixer API are by default relative to EUR. You can specify a different base currency and filter output to specific currency symbols. Changing the base currency requires a paid plan.

### Currency Conversion

Allows for conversion of any amount from one currency to another. You can specify a date (format YYYY-MM-DD) to use historical rates for the conversion. Requires specifying source currency, target currency, and amount.

### Historical Rates

Returns historical exchange rate data for all available or a specific set of currencies. Query by appending a date in YYYY-MM-DD format. The Fixer API delivers EOD / End of Day historical exchange rates, which become available at 00:05am GMT for the previous day.

### Time-Series Data

Returns daily historical exchange rate data between two specified dates for all available or a specific set of currencies. The time-series endpoint has a maximum time frame of 365 days.

### Fluctuation Data

Returns fluctuation data between two specified dates for all available or a specific set of currencies. This provides information about how currencies fluctuate on a day-to-day basis, including change and change percentage values.

### Supported Currencies List

The Fixer API comes with a constantly updated endpoint returning all available currencies. To access this list, make a request to the API's symbols endpoint. The Fixer API is capable of delivering accurate exchange rate data for 170 world currencies, including Bitcoin, Gold and Silver rates.

## Events

The provider does not support events. Fixer is a data-retrieval API for exchange rates and does not offer webhooks or event subscription mechanisms.
