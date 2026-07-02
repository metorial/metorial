# Slates Specification for NewsAPI

## Overview

News API is a simple, easy-to-use REST API that returns JSON search results for current and historic news articles published by over 150,000 worldwide sources. It supports searching through hundreds of millions of articles in 14 languages from 55 countries. It tracks headlines in 7 categories across over 50 countries, and at over a hundred top publications and blogs, in near real time.

## Authentication

Authentication is handled with a simple API key. You can obtain a free API key by registering at [newsapi.org](https://newsapi.org/register).

The API key can be provided in one of three ways:

1. Via the `apiKey` querystring parameter. Example: `https://newsapi.org/v2/everything?q=keyword&apiKey=YOUR_API_KEY`
2. Via the `X-Api-Key` HTTP header.
3. Via the `Authorization` HTTP header. Including `Bearer` is optional, and be sure not to base64 encode it.

If you don't append your API key correctly, or your API key is invalid, you will receive a 401 - Unauthorized HTTP error.

## Features

### Article Search

Search through the full archive of news articles for discovery and analysis. Search every article published by over 150,000 different sources large and small in the last 5 years.

- **Keyword search**: Search for keywords or phrases in the article title and body. Supports exact match with quotes, required/excluded terms with `+`/`-` prefixes, and AND / OR / NOT keywords, optionally grouped with parentheses.
- **Search field restriction**: Restrict your search to specific fields (title, content). Multiple options can be specified by separating them with a comma.
- **Source/domain filtering**: Filter by source identifiers (maximum 20), include specific domains, or exclude specific domains from results.
- **Date range**: Filter articles by specifying a start and/or end date in ISO 8601 format.
- **Language**: Filter by the 2-letter ISO-639-1 language code. Supports Arabic, German, English, Spanish, French, Hebrew, Italian, Dutch, Norwegian, Portuguese, Russian, Swedish, Urdu, and Chinese.
- **Sorting**: Sort results by relevancy, popularity, or publishedAt.
- Article content is truncated to 200 chars. Full article content must be fetched from the article's source URL directly.

### Top Headlines

Provides live top and breaking headlines for a country, specific category in a country, single source, or multiple sources. You can also search with keywords.

- **Country**: Filter by country using 2-letter ISO 3166-1 codes. You can't mix this param with the sources param.
- **Category**: Filter by category: business, entertainment, general, health, science, sports, or technology. You can't mix this param with the sources param.
- **Sources**: Filter by a comma-separated string of identifiers for the news sources or blogs you want headlines from.

### Source Discovery

Returns the subset of news publishers that top headlines are available from. It's mainly a convenience endpoint to keep track of the publishers available on the API.

- Filter sources by category, language, and country.
- Returns the identifier of the news source, which you can use with other endpoints. Also includes the source name, description, URL, category, language, and country.

## Events

The provider does not support events. NewsAPI is a read-only REST API for searching and retrieving news articles. It does not offer webhooks, event subscriptions, or any push-based notification mechanism.
