# Fixer Integration Specification

## Overview

Fixer is a foreign exchange rate API that provides real-time and historical currency exchange rate data for over 170 world currencies. It delivers JSON-formatted data aggregated from 15+ trusted financial sources, including banks and the European Central Bank. Historical exchange rate data is available all the way back to 1st January, 1999.

## Authentication

Fixer API uses API keys to authenticate requests. There are two methods of passing the API key depending on which API host you use:

1. **Via query parameter (data.fixer.io):** Your API Key is the unique key that is passed into the API base URL's `access_key` parameter in order to authenticate with the Fixer API. Example: `https://data.fixer.io/api/latest?access_key=YOUR_ACCESS_KEY`

2. **Via HTTP header (api.apilayer.com):** All requests made to the API must hold a custom HTTP header named `apikey`. Example: `--header 'apikey: YOUR_API_KEY'` with base URL `https://api.apilayer.com/fixer/`.

The connection's optional `apiHost` selects `apilayer` (the default) or `fixer`. An APILayer Marketplace key uses the APILayer host and header; a fixer.io account key uses the direct host and query parameter. The selected host is saved with the connection. Connections created before this setting existed continue using APILayer. Keys and subscription entitlements are specific to the selected host; no automatic host fallback is performed. Both supported hosts use HTTPS.

## Features

### Latest Exchange Rates

Returns real-time exchange rate data for all available or a specific set of currencies. Exchange rates delivered by the Fixer API are by default relative to EUR. You can specify a different base currency and filter output to specific currency symbols. Permitted base currencies and endpoint availability depend on the subscription for the selected API host.

### Currency Conversion

Allows for conversion of any amount from one currency to another. You can specify a date (format YYYY-MM-DD) to use historical rates for the conversion. Requires specifying source currency, target currency, and amount.

### Historical Rates

Returns historical exchange rate data for all available or a specific set of currencies. Query by appending a date in YYYY-MM-DD format. The Fixer API delivers EOD / End of Day historical exchange rates, which become available at 00:05am GMT for the previous day.

### Time-Series Data

Returns daily historical exchange rate data between two specified dates for all available or a specific set of currencies. The time-series endpoint has a maximum time frame of 365 days.

### Fluctuation Data

Returns fluctuation data between two specified dates for all available or a specific set of currencies. This provides start and end rates, absolute change, and percentage change across the requested period.

### Supported Currencies List

The Fixer API comes with a constantly updated endpoint returning all available currencies. To access this list, make a request to the API's symbols endpoint. The Fixer API is capable of delivering accurate exchange rate data for 170 world currencies, including Bitcoin, Gold and Silver rates.

## Events

The provider does not support events. Fixer is a data-retrieval API for exchange rates and does not offer webhooks or event subscription mechanisms.

## Error Handling And Validation

Provider errors, including HTTP-success responses containing `success: false`, are reported with the provider message, code, and available HTTP status. Empty API keys, malformed calendar dates, reversed date ranges, and time-series ranges longer than 365 days are rejected before sending a request. Existing input and output fields retain their original types, optionalness, and defaults.

## Official References

- [APILayer Marketplace Fixer API](https://marketplace.apilayer.com/fixer-api): APILayer host, API-key header, six endpoint families, response examples.
- [Fixer API documentation](https://docs.apilayer.com/fixer/docs/api-documentation): direct-host authentication and endpoint query parameters.
- [Fixer getting started](https://apilayer.portal.swaggerhub.com/fixer/docs/getting-started): direct base URL and provider error envelopes.
- [APILayer Fixer Postman collection](https://www.postman.com/apilayer/apilayer/documentation/xvuply8/fixer): endpoint request and response details.
