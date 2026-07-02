Now let me check the specific DigitalRank API documentation to understand the exact endpoints.Now I have enough information to write the specification. The DigitalRank API is specifically the free tier of SimilarWeb's API focused on website ranking data. Let me compile the spec.

# Slates Specification for SimilarWeb Digital Rank API

## Overview

SimilarWeb DigitalRank API is a free REST API that provides global website ranking data based on SimilarWeb's SimilarRank algorithm. It offers metrics such as global rank, country rank, and category rank for any domain, derived from over 10 billion daily digital signals. The free tier includes 100 data credits per month.

## Authentication

SimilarWeb DigitalRank API uses API keys for authentication.

To get started, you'll need to have a Similarweb account and generate a personalized API key. Steps to obtain an API key:

1. Click the Settings icon and select Account. From the API page, click Generate A New API Key.
2. Insert a name for your key (e.g., "MySimilarwebAPIKey") and click Create. Your API key will appear in the Generated Keys table.

The API key is passed as a query parameter `api_key` on each request. For example:

```
https://api.similarweb.com/user-capabilities?api_key=YOUR_API_KEY
```

If an API key has been created but not activated, you will receive an "Invalid API key" error when trying to pull data with it. Under the Activation column, make sure the toggle is on for the relevant API key.

## Features

### Website Global Rank Lookup

Retrieves the global rank of a specific website using Similarweb's Digital Rank API. Returns SimilarWeb's monthly Global Rank for a given domain.

- **Parameters:** Domain name, optional start/end date (format: YYYY-MM), optional main domain only flag (include or exclude subdomains), output format (JSON or XML).
- To retrieve last 28 days, remove the start_date and end_date parameters from the URL.

### Website Country Rank

Returns SimilarWeb's monthly Country Rank for a given domain.

- **Parameters:** Domain name, start/end date, country filter as a 2-letter ISO country code, optional main domain only flag, output format.
- Worldwide country filter is not currently supported.

### Website Category Rank

Returns the Category of a given domain and its Global Rank within its given category.

- **Parameters:** Domain name, output format (JSON or XML).

### Top Ranked Websites

Lists the top-ranking websites globally. Rankings are calculated via SimilarWeb's SimilarRank algorithm.

- **Parameters:** `limit` — default is 10, returns up to 5,000 results max.

### Subscription Status and Remaining Credits

Returns the number of monthly data points remaining in your Similarweb account.

- This endpoint does not cost any hits.

## Events

The provider does not support events. The DigitalRank API is a read-only data retrieval API with no webhook or event subscription capabilities.
