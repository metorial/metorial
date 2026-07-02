# Slates Specification for Currents API

## Overview

Currents News API provides a comprehensive solution for curating global news and delivering it in a parseable JSON format. News articles from 70 countries and 18 different languages are added daily, monitoring over 43,552 news domains to provide the latest updates. The API provides access to both real-time and historical news articles from news sources, blogs, and forums.

## Authentication

Authentication is handled with a simple API key. You can attach your API key to a request in one of two ways: via the `Authorization` HTTP header, or via the `apiKey` query string parameter.

To obtain an API key:

1. Go to https://currentsapi.services/ and sign up for a free account. Once logged in, you will be given an API key that you will use to authenticate your requests.

**Header-based authentication example:**

```
Authorization: YOUR_API_KEY
```

**Query parameter authentication example:**

```
https://api.currentsapi.services/v1/latest-news?apiKey=YOUR_API_KEY
```

If the API key is not appended correctly, or if the API key is invalid, you will receive the following HTTP error "401 - Unauthorized".

## Features

### Latest News Retrieval

The Latest News Endpoint provides a real-time stream of international news articles from diverse sources. Use this endpoint to fetch the most recent news and stay updated on global events.

- Can be filtered by language (defaults to English). Supported language codes are available at `/v1/available/languages`.
- Each article includes title, description, image URL, publication date, category, author, and source information.

### News Search

The Search Endpoint allows you to search through tens of millions of articles from over 14,000 news sources and blogs, including breaking news, blog articles, and forum content.

- **Keywords**: Search for exact matches of words in titles or descriptions.
- **Language**: Filter results by language code. Codes available via `/v1/available/languages`.
- **Date range**: `start_date` and `end_date` parameters to search for news published within a specific time window, in RFC 3339 format.
- **Content type**: Filter by type — news (1), articles (2), or discussion content (3).
- **Country**: Filter by the country code of the news source. Codes available via `/v1/available/regions`.
- **Category**: Filter results by news category. Categories available via `/v1/available/categories`.
- **Domain filtering**: Filter results by specific website domains, or exclude specific domains from results.
- **Page size**: Specify the number of articles per page.

Available categories include: regional, technology, lifestyle, business, general, programming, science, entertainment, world, sports, finance, academia, politics, health, opinion, food, and game.

### News Source Discovery

You can get a list of available news sources, and retrieve news articles from a specific news source. Sources can be filtered by language and category.

### Reference Data

The API provides endpoints for retrieving lists of supported languages, regions, and categories for filtering news. These helper endpoints (`/v1/available/languages`, `/v1/available/regions`, `/v1/available/categories`) allow you to discover valid filter values dynamically.

### Trend and Sentiment Analysis

You can understand the number of articles that mention a specific topic over a period of time, which allows a pulse check of trending topics. You can also get insights into changes in sentiment specific to topics of interest, for example, sentiment of news on a specific company.

## Events

The provider does not support events. Currents API is a read-only news data API with no webhooks, event subscriptions, or purpose-built polling mechanisms.
